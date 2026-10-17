using BookingApp.Application.DTOs.Bookings;
using BookingApp.Application.Interfaces;
using BookingApp.Domain.Entities;
using BookingApp.Domain.Enums;
using BookingApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BookingApp.Infrastructure.Services;

public class BookingService : IBookingService
{
    private readonly AppDbContext _context;
    private readonly INotificationService _notifications;
    private readonly IEmailService _email;
    private readonly ILogger<BookingService> _logger;

    public BookingService(
        AppDbContext context,
        INotificationService notifications,
        IEmailService email,
        ILogger<BookingService> logger)
    {
        _context = context;
        _notifications = notifications;
        _email = email;
        _logger = logger;
    }

    public async Task<BookingResponseDto> CreateAsync(
        CreateBookingDto dto, Guid clientId, Guid tenantId, string role)
    {
        var service = await LoadServiceAsync(dto.ServiceId);

        if (role != "SuperAdmin" && service.Business.TenantId != tenantId)
            throw new InvalidOperationException("Servicio no encontrado.");

        var (startUtc, endUtc) = await ValidateSlotAsync(service, dto.StaffId, dto.StartTime);

        var booking = Booking.Create(dto.ServiceId, dto.StaffId, clientId,
            startUtc, service.DurationMinutes, dto.Notes);

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        var client = await _context.Users.FirstAsync(u => u.Id == clientId);
        await NotifyCreatedAsync(service.Business.TenantId, client.FullName, service.Name, startUtc);

        return await MapToResponseAsync(booking.Id);
    }

    public async Task<PublicBookingResultDto> CreatePublicAsync(PublicBookingDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName) || string.IsNullOrWhiteSpace(dto.Email))
            throw new InvalidOperationException("Nombre y email son obligatorios.");

        var service = await LoadServiceAsync(dto.ServiceId);
        var (startUtc, endUtc) = await ValidateSlotAsync(service, dto.StaffId, dto.StartTime);

        // El cliente invitado se crea dentro del tenant del negocio
        var tenantId = service.Business.TenantId;
        var email = dto.Email.Trim().ToLower();
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == email && u.TenantId == tenantId);

        if (user is null)
        {
            user = AppUser.Create(tenantId, email, dto.FullName.Trim(), "Client");
            user.SetPasswordHash(BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()));
            _context.Users.Add(user);
        }

        var booking = Booking.Create(dto.ServiceId, dto.StaffId, user.Id,
            startUtc, service.DurationMinutes, dto.Notes);

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        await _email.SendBookingConfirmationAsync(
            email, dto.FullName, service.Name, BusinessTime.UtcToLocal(startUtc));
        await NotifyCreatedAsync(tenantId, dto.FullName, service.Name, startUtc);

        return new PublicBookingResultDto
        {
            BookingId   = booking.Id,
            ServiceName = service.Name,
            StartTime   = DateTime.SpecifyKind(startUtc, DateTimeKind.Utc),
            EndTime     = DateTime.SpecifyKind(endUtc, DateTimeKind.Utc),
            Message     = "Reserva creada correctamente. Recibirás un email de confirmación."
        };
    }

    public async Task<IEnumerable<BookingResponseDto>> GetByClientAsync(Guid clientId)
    {
        var bookings = await BookingsWithDetails()
            .Where(b => b.ClientId == clientId)
            .OrderByDescending(b => b.StartTime)
            .ToListAsync();

        return bookings.Select(MapToDto);
    }

    public async Task<IEnumerable<BookingResponseDto>> GetByBusinessAsync(
        Guid businessId, DateOnly from, DateOnly to, Guid tenantId, string role)
    {
        if (from > to)
            throw new InvalidOperationException("La fecha de inicio no puede ser mayor que la de fin.");
        if (to.DayNumber - from.DayNumber > 120)
            throw new InvalidOperationException("El rango máximo es de 120 días.");

        var businessVisible = await _context.Businesses
            .AnyAsync(b => b.Id == businessId && (role == "SuperAdmin" || b.TenantId == tenantId));

        if (!businessVisible)
            throw new InvalidOperationException("Negocio no encontrado.");

        // Días completos (ambos incluidos) en hora local del negocio, expresados en UTC
        var dayStart = BusinessTime.LocalToUtc(from.ToDateTime(TimeOnly.MinValue));
        var dayEnd   = BusinessTime.LocalToUtc(to.AddDays(1).ToDateTime(TimeOnly.MinValue));

        var bookings = await BookingsWithDetails()
            .Where(b => b.Service.BusinessId == businessId
                     && b.StartTime >= dayStart
                     && b.StartTime < dayEnd)
            .OrderBy(b => b.StartTime)
            .ToListAsync();

        return bookings.Select(MapToDto);
    }

    public async Task<BookingResponseDto> CancelAsync(Guid bookingId, Guid clientId)
    {
        var booking = await BookingsWithDetails()
            .Include(b => b.Service).ThenInclude(s => s.Business)
            .FirstOrDefaultAsync(b => b.Id == bookingId && b.ClientId == clientId)
            ?? throw new InvalidOperationException("Reserva no encontrada.");

        if (booking.Status == BookingStatus.Cancelled)
            throw new InvalidOperationException("La reserva ya está cancelada.");

        booking.Cancel();
        booking.SetUpdated();
        await _context.SaveChangesAsync();

        try
        {
            await _notifications.SendBookingCancelledAsync(
                booking.Service.Business.TenantId,
                booking.Client.FullName,
                booking.Service.Name,
                BusinessTime.UtcToLocal(booking.StartTime));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo enviar la notificación de cancelación de {BookingId}", booking.Id);
        }

        return MapToDto(booking);
    }

    // ---------- Validación común a reservas autenticadas y públicas ----------

    private async Task<Service> LoadServiceAsync(Guid serviceId)
    {
        var service = await _context.Services
            .Include(s => s.Business)
            .FirstOrDefaultAsync(s => s.Id == serviceId);

        if (service is null || !service.IsActive)
            throw new InvalidOperationException("Servicio no encontrado.");

        return service;
    }

    /// <summary>
    /// Comprueba que el empleado pertenece al negocio del servicio, que la hora
    /// (local del negocio) cae dentro del horario y que no se solapa con otra reserva.
    /// </summary>
    private async Task<(DateTime StartUtc, DateTime EndUtc)> ValidateSlotAsync(
        Service service, Guid staffId, DateTime localStart)
    {
        var staffValid = await _context.Staff
            .AnyAsync(s => s.Id == staffId && s.BusinessId == service.BusinessId && s.IsActive);

        if (!staffValid)
            throw new InvalidOperationException("El empleado no pertenece a este negocio.");

        var startUtc = BusinessTime.LocalToUtc(localStart);
        var endUtc   = startUtc.AddMinutes(service.DurationMinutes);

        if (startUtc <= DateTime.UtcNow)
            throw new InvalidOperationException("No se puede reservar en una hora pasada.");

        var startLocal = BusinessTime.UtcToLocal(startUtc);
        var endLocal   = BusinessTime.UtcToLocal(endUtc);
        if (TimeOnly.FromDateTime(startLocal) < service.Business.OpenTime
            || TimeOnly.FromDateTime(endLocal) > service.Business.CloseTime
            || endLocal.Date != startLocal.Date)
            throw new InvalidOperationException("La hora está fuera del horario del negocio.");

        var conflict = await _context.Bookings
            .AnyAsync(b => b.StaffId == staffId
                        && b.Status != BookingStatus.Cancelled
                        && b.StartTime < endUtc
                        && b.EndTime > startUtc);

        if (conflict)
            throw new InvalidOperationException("Ese horario ya está reservado.");

        return (startUtc, endUtc);
    }

    private async Task NotifyCreatedAsync(Guid tenantId, string clientName, string serviceName, DateTime startUtc)
    {
        try
        {
            await _notifications.SendBookingCreatedAsync(
                tenantId, clientName, serviceName, BusinessTime.UtcToLocal(startUtc));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo enviar la notificación de nueva reserva");
        }
    }

    // ---------- Mapeo ----------

    private IQueryable<Booking> BookingsWithDetails() => _context.Bookings
        .Include(b => b.Service)
        .Include(b => b.Staff)
        .Include(b => b.Client);

    private async Task<BookingResponseDto> MapToResponseAsync(Guid bookingId)
    {
        var booking = await BookingsWithDetails().FirstAsync(b => b.Id == bookingId);
        return MapToDto(booking);
    }

    private static BookingResponseDto MapToDto(Booking b) => new()
    {
        Id            = b.Id,
        ServiceName   = b.Service.Name,
        StaffName     = b.Staff.Name,
        ClientName    = b.Client.FullName,
        StartTime     = DateTime.SpecifyKind(b.StartTime, DateTimeKind.Utc),
        EndTime       = DateTime.SpecifyKind(b.EndTime, DateTimeKind.Utc),
        Status        = b.Status.ToString(),
        PaymentStatus = b.PaymentStatus.ToString(),
        Price         = b.Service.Price,
        Notes         = b.Notes
    };
}
