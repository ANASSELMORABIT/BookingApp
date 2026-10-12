namespace BookingApp.Application.Interfaces;

public interface INotificationHub
{
    Task SendToTenantAsync(string tenantId, string method, object data);
}