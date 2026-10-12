using BookingApp.Application.DTOs.Bookings;
using BookingApp.Application.Interfaces;
using BookingApp.Domain.Entities;
using BookingApp.Domain.Enums;
using BookingApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BookingApp.Infrastructure.Services;

public class BookingService : IBookingService
{
    private readonly AppDbContext _context;
    private readonly INotificationService _notifications;

   public BookingService(AppDbContext context, INotificationService notifications)
    {
        _context = context;
        _notifications = notifications;
    }
    public async Task<BookingResponseDto> CreateAsync(
        CreateBookingDto dto, Guid clientId, Guid tenantId)
    {
        Console.WriteLine($"********************** dto.StartTime **********************  : {dto.StartTime} | Kind: {dto.StartTime.Kind}");
        var service = await _context.Services
            .Include(s => s.Business)   
            .FirstOrDefaultAsync(s => s.Id == dto.ServiceId)
            ?? throw new InvalidOperationException("Servicio no encontrado.");

        // Convertir la hora recibida (que está en hora local de Madrid) a UTC
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Madrid");
        var startTimeLocal = DateTime.SpecifyKind(dto.StartTime, DateTimeKind.Unspecified);
        var startTimeUtc   = TimeZoneInfo.ConvertTimeToUtc(startTimeLocal, timeZone);
        var endTime        = startTimeUtc.AddMinutes(service.DurationMinutes);

        Console.WriteLine($"********************** startTimeUtc **********************  : {startTimeUtc} | Kind: {startTimeUtc.Kind}");
        Console.WriteLine($"********************** endTime **********************  : {endTime} | Kind: {endTime.Kind}");
        Console.WriteLine($"********************** service.DurationMinutes **********************  : {service.DurationMinutes}");
        Console.WriteLine($"********************** dto.StaffId **********************  : {dto.StaffId}");
        // Verificar que no haya solapamiento
        

        var conflict = await _context.Bookings
            .AnyAsync(b => b.StaffId == dto.StaffId
                        && b.Status != BookingStatus.Cancelled
                        && b.StartTime < endTime
                        && b.EndTime   > startTimeUtc);

        if (conflict)
            throw new InvalidOperationException("Ese horario ya está reservado.");

        var booking = Booking.Create(
            dto.ServiceId,
            dto.StaffId,
            clientId,
            startTimeUtc,
            service.DurationMinutes);

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

         var fullBooking = await _context.Bookings
            .Include(b => b.Service)
            .Include(b => b.Client)
            .FirstAsync(b => b.Id == booking.Id);

        await _notifications.SendBookingCreatedAsync(
            tenantId,
            fullBooking.Client.FullName,
            fullBooking.Service.Name,
            fullBooking.StartTime);

        return await MapToResponseAsync(booking.Id);
    }

    public async Task<IEnumerable<BookingResponseDto>> GetByClientAsync(Guid clientId)
    {
        var bookings = await _context.Bookings
            .Include(b => b.Service)
            .Include(b => b.Staff)
            .Include(b => b.Client)
            .Where(b => b.ClientId == clientId)
            .OrderByDescending(b => b.StartTime)
            .ToListAsync();

        return bookings.Select(MapToDto);
    }

    public async Task<IEnumerable<BookingResponseDto>> GetByBusinessAsync(
        Guid businessId, DateOnly date)
    {
        var dayStart = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var dayEnd   = date.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        var bookings = await _context.Bookings
            .Include(b => b.Service)
            .Include(b => b.Staff)
            .Include(b => b.Client)
            .Where(b => b.Service.BusinessId == businessId
                     && b.StartTime >= dayStart
                     && b.StartTime <= dayEnd)
            .OrderBy(b => b.StartTime)
            .ToListAsync();

        return bookings.Select(MapToDto);
    }

    public async Task<BookingResponseDto> CancelAsync(Guid bookingId, Guid clientId)
    {
        var booking = await _context.Bookings
            .Include(b => b.Service)
                .ThenInclude(s => s.Business)
            .Include(b => b.Staff)  // AÑADE ESTA LÍNEA
            .Include(b => b.Client)
            .FirstOrDefaultAsync(b => b.Id == bookingId && b.ClientId == clientId)
            ?? throw new InvalidOperationException("Reserva no encontrada.");

        booking.Cancel();
        booking.SetUpdated();
        await _context.SaveChangesAsync();

        if (_notifications != null && booking.Service?.Business?.TenantId != null)
        {
            try
            {
                await _notifications.SendBookingCancelledAsync(
                    booking.Service.Business.TenantId,
                    booking.Client?.FullName ?? "Cliente",
                    booking.Service?.Name ?? "Servicio",
                    booking.StartTime);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WARN] Notificación fallida: {ex.Message}");
            }
        }

        return MapToDto(booking);
    }
    private async Task<BookingResponseDto> MapToResponseAsync(Guid bookingId)
    {
        var booking = await _context.Bookings
            .Include(b => b.Service)
            .Include(b => b.Staff)
            .Include(b => b.Client)
            .FirstAsync(b => b.Id == bookingId);

        return MapToDto(booking);
    }

        private static BookingResponseDto MapToDto(Booking b)
        {
            return new()
            {
                Id            = b.Id,
                ServiceName   = b.Service.Name,
                StaffName     = b.Staff.Name,
                ClientName    = b.Client.FullName,
                StartTime     = DateTime.SpecifyKind(b.StartTime, DateTimeKind.Utc), // ← marca como UTC
                EndTime       = DateTime.SpecifyKind(b.EndTime,   DateTimeKind.Utc), // ← marca como UTC
                Status        = b.Status.ToString(),
                PaymentStatus = b.PaymentStatus.ToString(),
                Price         = b.Service.Price,
                Notes         = b.Notes
            };
        }
    }