using BookingApp.Application.Interfaces;
using BookingApp.Domain.Enums;
using BookingApp.Infrastructure.Persistence;
using BookingApp.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BookingApp.Infrastructure.Jobs;

/// <summary>
/// Cada minuto: las reservas cuyo cliente no ha llegado pasada la tolerancia del negocio
/// (10 min por defecto) se cancelan como "no presentado" y el cliente pasa a la lista de avisos.
/// </summary>
public class LateBookingJob
{
    /// <summary>Solo se revisan reservas que empezaron hace menos de este tiempo.</summary>
    public static readonly TimeSpan LookBack = TimeSpan.FromHours(2);

    private readonly AppDbContext _context;
    private readonly INotificationService _notifications;
    private readonly ILogger<LateBookingJob> _logger;

    public LateBookingJob(AppDbContext context, INotificationService notifications, ILogger<LateBookingJob> logger)
    {
        _context = context;
        _notifications = notifications;
        _logger = logger;
    }

    public Task CancelLateBookingsAsync() => RunAsync(DateTime.UtcNow);

    public async Task<int> RunAsync(DateTime nowUtc)
    {
        var since = nowUtc - LookBack;

        var candidates = await _context.Bookings
            .Include(b => b.Client)
            .Include(b => b.Service).ThenInclude(s => s.Business)
            .Where(b => (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed)
                     && b.ArrivedAt == null
                     && b.StartTime >= since
                     && b.StartTime < nowUtc
                     && b.Service.Business.AutoCancelLate)
            .ToListAsync();

        var late = candidates
            .Where(b => b.StartTime.AddMinutes(b.Service.Business.LateToleranceMinutes) <= nowUtc)
            .ToList();

        foreach (var booking in late)
        {
            booking.MarkNoShow(nowUtc);
            // El equipo del negocio que reserva para sí mismo no entra en la lista de avisos
            if (booking.Client.Role == "Client")
                booking.Client.RegisterNoShow();
        }

        if (late.Count > 0)
            await _context.SaveChangesAsync();

        foreach (var booking in late)
        {
            var local = BusinessTime.UtcToLocal(booking.StartTime);
            try
            {
                await _notifications.SendAlertAsync(booking.Service.Business.TenantId,
                    "Cliente no presentado",
                    $"{booking.Client.FullName} no llegó a {booking.Service.Name} de las {local:HH:mm}. " +
                    "La reserva se ha cancelado y el cliente pasa a la lista de avisos.");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "No se pudo avisar del no presentado {BookingId}", booking.Id);
            }
        }

        if (late.Count > 0)
            _logger.LogInformation("[JOB] Reservas canceladas por retraso: {Count}", late.Count);
        return late.Count;
    }
}
