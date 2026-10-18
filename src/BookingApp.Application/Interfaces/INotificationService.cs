namespace BookingApp.Application.Interfaces;

public interface INotificationService
{
    Task SendBookingCreatedAsync(Guid tenantId, string clientName, string serviceName, DateTime startTime);
    Task SendBookingCancelledAsync(Guid tenantId, string clientName, string serviceName, DateTime startTime);
    Task SendBookingConfirmedAsync(Guid tenantId, string clientName, string serviceName, DateTime startTime);
    /// <summary>Alerta para el negocio (cliente con aviso, cliente no presentado…).</summary>
    Task SendAlertAsync(Guid tenantId, string title, string message);
}