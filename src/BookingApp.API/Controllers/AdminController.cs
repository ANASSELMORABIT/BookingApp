using System.Security.Claims;
using BookingApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookingApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "SameTenantOnly")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    private Guid TenantId => Guid.Parse(User.FindFirstValue("tenant_id")!);

    [HttpGet("dashboard")]
    [Authorize(Policy = "OwnerOrStaff")]
    public async Task<IActionResult> GetDashboard([FromQuery] Guid? businessId = null)
    {
        var role = User.FindFirstValue(ClaimTypes.Role)!;
        var stats = await _adminService.GetDashboardStatsAsync(TenantId, businessId, role);
        return Ok(stats);
    }

    [HttpGet("bookings-by-period")]
    [Authorize(Policy = "OwnerOnly")]
    public async Task<IActionResult> GetBookingsByPeriod(
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to)
    {
        if (from > to)
            return BadRequest(new { message = "La fecha de inicio no puede ser mayor que la de fin." });

        var result = await _adminService.GetBookingsByPeriodAsync(TenantId, from, to);
        return Ok(result);
    }

    [HttpGet("staff-stats/{businessId}")]
    [Authorize(Policy = "OwnerOrStaff")]
    public async Task<IActionResult> GetStaffStats(Guid businessId)
    {
        try
        {
            var result = await _adminService.GetStaffStatsAsync(businessId, TenantId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}