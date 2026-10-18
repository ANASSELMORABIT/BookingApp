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
    public const string BlockedMessage =
        "No puedes reservar en este negocio en este momento. Ponte en contacto con el negocio.";
    public const string PoliciesMessage = "Debes leer y aceptar las normas del negocio para reservar.";

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

        EnsurePoliciesAccepted(service.Business, dto.AcceptPolicies);

        var client = await _context.Users.FirstAsync(u => u.Id == clientId);
        if (client.IsBlocked)
            throw new InvalidOperationException(BlockedMessage);

        var extras = await ServiceExtras.LoadAsync(_context, service.Id, dto.ExtraIds);
        var minutes = ServiceExtras.TotalMinutes(service, extras);
        var (startUtc, _) = await ValidateSlotAsync(service, dto.StaffId, dto.StartTime, minutes);

        var booking = Booking.Create(dto.ServiceId, dto.StaffId, clientId, startUtc, minutes, dto.Notes);
        booking.ApplyPricing(service.Price, extras);
        if (client.IsFlagged) booking.MarkClientFlagged();

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        await NotifyCreatedAsync(service.Business.TenantId, client, service.Name, startUtc);

        return await MapToResponseAsync(booking.Id);
    }

    public async Task<PublicBookingResultDto> CreatePublicAsync(PublicBookingDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName) || string.IsNullOrWhiteSpace(dto.Email))
            throw new InvalidOperationException("Nombre y email son obligatorios.");

        var service = await LoadServiceAsync(dto.ServiceId);
        EnsurePoliciesAccepted(service.Business, dto.AcceptPolicies);

        // El cliente invitado se crea dentro del tenant del negocio
        var tenantId = service.Business.TenantId;
        var email = dto.Email.Trim().ToLower();
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == email && u.TenantId == tenantId);

        if (user?.IsBlocked == true)
            throw new InvalidOperationException(BlockedMessage);

        var extras = await ServiceExtras.LoadAsync(_context, service.Id, dto.ExtraIds);
        var minutes = ServiceExtras.TotalMinutes(service, extras);
        var (startUtc, endUtc) = await ValidateSlotAsync(service, dto.StaffId, dto.StartTime, minutes);

        if (user is null)
        {
            user = AppUser.Create(tenantId, email, dto.FullName.Trim(), "Client");
            user.SetPasswordHash(BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()));
            _context.Users.Add(user);
        }

        var booking = Booking.Create(dto.ServiceId, dto.StaffId, user.Id,
            startUtc, minutes, dto.Notes);
        booking.ApplyPricing(service.Price, extras);
        if (user.IsFlagged) booking.MarkClientFlagged();

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        await _email.SendBookingConfirmationAsync(
            email, dto.FullName, service.Name, BusinessTime.UtcToLocal(startUtc));
        await NotifyCreatedAsync(tenantId, user, service.Name, startUtc);

        return new PublicBookingResultDto
        {
            BookingId   = booking.Id,
            ServiceName = service.Name,
            StartTime   = DateTime.SpecifyKind(startUtc, DateTimeKind.Utc),
            EndTime     = DateTime.SpecifyKind(endUtc, DateTimeKind.Utc),
            BasePrice   = service.Price,
            TotalPrice  = booking.TotalPrice,
            Extras      = booking.Extras.Select(MapExtra).ToList(),
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
            .FirstOrDefaultAsync(b => b.Id == bookingId && b.ClientId == clientId)
            ?? throw new InvalidOperationException("Reserva no encontrada.");

        if (!booking.IsActive)
            throw new InvalidOperationException("Esta reserva ya no se puede cancelar.");

        var now = DateTime.UtcNow;
        var business = booking.Service.Business;
        booking.Cancel();
        booking.SetUpdated();

        // Cancelar sin el aviso mínimo bloquea al cliente (no al equipo del negocio)
        var freeUntil = business.FreeCancellationUntil(booking.StartTime);
        var penalized = freeUntil is not null && now > freeUntil && booking.Client.Role == "Client";
        if (penalized)
            booking.Client.Block(
                $"Canceló con menos de {business.CancellationNoticeHours} h de antelación ({BusinessTime.UtcToLocal(booking.StartTime):dd/MM/yyyy HH:mm}).", now);

        await _context.SaveChangesAsync();

        await SafeNotifyAsync(() => _notifications.SendBookingCancelledAsync(
            business.TenantId, booking.Client.FullName, booking.Service.Name,
            BusinessTime.UtcToLocal(booking.StartTime)), booking.Id);

        if (penalized)
            await SafeNotifyAsync(() => _notifications.SendAlertAsync(business.TenantId,
                "Cliente bloqueado",
                $"{booking.Client.FullName} ha cancelado {booking.Service.Name} sin el aviso mínimo de {business.CancellationNoticeHours} h y ya no puede reservar."), booking.Id);

        return MapToDto(booking);
    }

    public async Task<BookingResponseDto> MarkArrivedAsync(Guid bookingId, Guid tenantId, string role)
    {
        var booking = await BookingsWithDetails()
            .FirstOrDefaultAsync(b => b.Id == bookingId
                && (role == "SuperAdmin" || b.Service.Business.TenantId == tenantId))
            ?? throw new InvalidOperationException("Reserva no encontrada.");

        booking.MarkArrived(DateTime.UtcNow);
        await _context.SaveChangesAsync();
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

    private static void EnsurePoliciesAccepted(Business business, bool accepted)
    {
        if (business.HasPolicies && !accepted)
            throw new InvalidOperationException(PoliciesMessage);
    }

    /// <summary>
    /// Comprueba que el empleado pertenece al negocio del servicio, que la cita completa
    /// (servicio + extras, en hora local del negocio) cae dentro del horario y que no se solapa.
    /// </summary>
    private async Task<(DateTime StartUtc, DateTime EndUtc)> ValidateSlotAsync(
        Service service, Guid staffId, DateTime localStart, int durationMinutes)
    {
        var staffValid = await _context.Staff
            .AnyAsync(s => s.Id == staffId && s.BusinessId == service.BusinessId && s.IsActive);

        if (!staffValid)
            throw new InvalidOperationException("El empleado no pertenece a este negocio.");

        var startUtc = BusinessTime.LocalToUtc(localStart);
        var endUtc   = startUtc.AddMinutes(durationMinutes);

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
                        && b.Status != BookingStatus.NoShow
                        && b.StartTime < endUtc
                        && b.EndTime > startUtc);

        if (conflict)
            throw new InvalidOperationException("Ese horario ya está reservado.");

        return (startUtc, endUtc);
    }

    private async Task NotifyCreatedAsync(Guid tenantId, AppUser client, string serviceName, DateTime startUtc)
    {
        var local = BusinessTime.UtcToLocal(startUtc);
        await SafeNotifyAsync(() => _notifications.SendBookingCreatedAsync(tenantId, client.FullName, serviceName, local), null);

        // Cliente de la lista de avisos: puede reservar, pero el negocio se entera
        if (client.IsFlagged)
            await SafeNotifyAsync(() => _notifications.SendAlertAsync(tenantId,
                "Cliente con aviso",
                $"{client.FullName} ha reservado {serviceName} el {local:dd/MM/yyyy} a las {local:HH:mm}. " +
                $"No se presentó a {client.NoShowCount} {(client.NoShowCount == 1 ? "cita" : "citas")} anteriores."), null);
    }

    private async Task SafeNotifyAsync(Func<Task> send, Guid? bookingId)
    {
        try
        {
            await send();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo enviar la notificación de la reserva {BookingId}", bookingId);
        }
    }

    // ---------- Mapeo ----------

    private IQueryable<Booking> BookingsWithDetails() => _context.Bookings
        .Include(b => b.Service).ThenInclude(s => s.Business)
        .Include(b => b.Staff)
        .Include(b => b.Client)
        .Include(b => b.Extras);

    private async Task<BookingResponseDto> MapToResponseAsync(Guid bookingId)
    {
        var booking = await BookingsWithDetails().FirstAsync(b => b.Id == bookingId);
        return MapToDto(booking);
    }

    private static BookingExtraDto MapExtra(BookingExtra e) => new()
    {
        Name = e.Name,
        Price = e.Price,
        ExtraMinutes = e.ExtraMinutes,
    };

    private static BookingResponseDto MapToDto(Booking b)
    {
        var extrasTotal = b.Extras.Sum(e => e.Price);
        // Las reservas anteriores a los extras no tienen total guardado: se usa el precio del servicio
        var total = b.TotalPrice > 0 ? b.TotalPrice : b.Service.Price + extrasTotal;
        var freeUntil = b.IsActive ? b.Service.Business.FreeCancellationUntil(b.StartTime) : null;
        return new BookingResponseDto
        {
            Id            = b.Id,
            ServiceName   = b.Service.Name,
            StaffName     = b.Staff.Name,
            ClientName    = b.Client.FullName,
            StartTime     = DateTime.SpecifyKind(b.StartTime, DateTimeKind.Utc),
            EndTime       = DateTime.SpecifyKind(b.EndTime, DateTimeKind.Utc),
            Status        = b.Status.ToString(),
            PaymentStatus = b.PaymentStatus.ToString(),
            Price         = total,
            BasePrice     = total - extrasTotal,
            Extras        = b.Extras.Select(MapExtra).ToList(),
            Notes         = b.Notes,
            ArrivedAt     = b.ArrivedAt is null ? null : DateTime.SpecifyKind(b.ArrivedAt.Value, DateTimeKind.Utc),
            ClientFlagged = b.ClientFlagged,
            FreeCancellationUntil = freeUntil is null ? null : DateTime.SpecifyKind(freeUntil.Value, DateTimeKind.Utc),
        };
    }
}
