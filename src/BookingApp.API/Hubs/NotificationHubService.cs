using BookingApp.Application.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace BookingApp.API.Hubs;

public class NotificationHubService : INotificationHub
{
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationHubService(IHubContext<NotificationHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task SendToTenantAsync(string tenantId, string method, object data)
    {
        await _hubContext.Clients.Group($"tenant_{tenantId}").SendAsync(method, data);
    }
}