using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace BookingApp.API.Authorization.Handlers;

public class SameTenantRequirement : IAuthorizationRequirement { }

public class TenantAuthorizationHandler : AuthorizationHandler<SameTenantRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        SameTenantRequirement requirement)
    {
        var tenantId = context.User.FindFirstValue("tenant_id");

        if (!string.IsNullOrEmpty(tenantId))
            context.Succeed(requirement);

        return Task.CompletedTask;
    }
}