using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace BookingApp.API.Hubs;

/// <summary>
/// Hub de notificaciones. Cada conexión entra en el grupo de su tenant según los claims del JWT;
/// el grupo "superadmin" queda reservado al rol SuperAdmin.
/// </summary>
[Authorize]
public class NotificationHub : Hub
{
    public const string SuperAdminGroup = "superadmin";

    public static string GroupFor(string tenantId) => $"tenant_{tenantId}";

    public override async Task OnConnectedAsync()
    {
        var tenantId = Context.User?.FindFirstValue("tenant_id");
        if (!string.IsNullOrEmpty(tenantId))
            await Groups.AddToGroupAsync(Context.ConnectionId, GroupFor(tenantId));

        if (IsSuperAdmin())
            await Groups.AddToGroupAsync(Context.ConnectionId, GroupFor(SuperAdminGroup));

        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Se mantiene por compatibilidad con el cliente. Solo permite unirse al propio tenant,
    /// o a cualquiera si el usuario es SuperAdmin.
    /// </summary>
    public async Task JoinTenantGroup(string tenantId)
    {
        var ownTenant = Context.User?.FindFirstValue("tenant_id");
        if (!IsSuperAdmin() && tenantId != ownTenant)
            throw new HubException("No autorizado para este tenant.");

        await Groups.AddToGroupAsync(Context.ConnectionId, GroupFor(tenantId));
    }

    public async Task LeaveTenantGroup(string tenantId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupFor(tenantId));
    }

    private bool IsSuperAdmin() => Context.User?.IsInRole("SuperAdmin") == true;
}
