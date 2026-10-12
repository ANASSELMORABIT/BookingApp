namespace BookingApp.Application.Interfaces;

public interface INotificationService
{
    Task SendBookingCreatedAsync(Guid tenantId, string clientName, string serviceName, DateTime startTime);
    Task SendBookingCancelledAsync(Guid tenantId, string clientName, string serviceName, DateTime startTime);
    Task SendBookingConfirmedAsync(Guid tenantId, string clientName, string serviceName, DateTime startTime);
}