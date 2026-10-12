using System.Security.Claims;
using BookingApp.API.Authorization.Requirements;
using Microsoft.AspNetCore.Authorization;

namespace BookingApp.API.Authorization.Handlers;

public class RoleRequirementHandler : AuthorizationHandler<RoleRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        RoleRequirement requirement)
    {
        var role = context.User.FindFirstValue(ClaimTypes.Role);

        if (role is not null && requirement.AllowedRoles.Contains(role))
            context.Succeed(requirement);

        return Task.CompletedTask;
    }
}