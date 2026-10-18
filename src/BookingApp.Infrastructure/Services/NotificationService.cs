using BookingApp.Application.Interfaces;

namespace BookingApp.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly INotificationHub _hub;

    public NotificationService(INotificationHub hub)
    {
        _hub = hub;
    }

   public async Task SendBookingCreatedAsync(Guid tenantId, string clientName, string serviceName, DateTime startTime)
    {
        var data = new
        {
            type    = "booking_created",
            title   = "Nueva reserva",
            message = $"{clientName} ha reservado {serviceName} para el {startTime:dd/MM/yyyy} a las {startTime:HH:mm}",
            time    = DateTime.UtcNow
        };

        // Enviar al tenant del negocio
        await _hub.SendToTenantAsync(tenantId.ToString(), "BookingCreated", data);
        // Enviar también al SuperAdmin
        await _hub.SendToTenantAsync("superadmin", "BookingCreated", data);
    }

        public async Task SendBookingCancelledAsync(Guid tenantId, string clientName, string serviceName, DateTime startTime)
        {
            var data = new
            {
                type    = "booking_cancelled",
                title   = "Reserva cancelada",
                message = $"{clientName} ha cancelado {serviceName} del {startTime:dd/MM/yyyy} a las {startTime:HH:mm}",
                time    = DateTime.UtcNow
            };

            await _hub.SendToTenantAsync(tenantId.ToString(), "BookingCancelled", data);
            await _hub.SendToTenantAsync("superadmin", "BookingCancelled", data);
        }

        public async Task SendBookingConfirmedAsync(Guid tenantId, string clientName, string serviceName, DateTime startTime)
        {
            var data = new
            {
                type    = "booking_confirmed",
                title   = "Reserva confirmada",
                message = $"{serviceName} confirmado para el {startTime:dd/MM/yyyy} a las {startTime:HH:mm}",
                time    = DateTime.UtcNow
            };

            await _hub.SendToTenantAsync(tenantId.ToString(), "BookingConfirmed", data);
            await _hub.SendToTenantAsync("superadmin", "BookingConfirmed", data);
        }

    public async Task SendAlertAsync(Guid tenantId, string title, string message)
    {
        var data = new
        {
            type    = "booking_alert",
            title,
            message,
            time    = DateTime.UtcNow
        };

        await _hub.SendToTenantAsync(tenantId.ToString(), "BookingAlert", data);
        await _hub.SendToTenantAsync("superadmin", "BookingAlert", data);
    }
}