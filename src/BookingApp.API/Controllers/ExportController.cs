using System.Security.Claims;
using BookingApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookingApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "OwnerOnly")]
public class ExportController : ControllerBase
{
    private readonly IExportService _exportService;

    public ExportController(IExportService exportService)
    {
        _exportService = exportService;
    }

    private Guid TenantId => Guid.Parse(User.FindFirstValue("tenant_id")!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet("excel")]
    public async Task<IActionResult> ExportExcel(
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to)
    {
        if (from > to)
            return BadRequest(new { message = "La fecha de inicio no puede ser mayor que la de fin." });

        var bytes = await _exportService.ExportBookingsToExcelAsync(TenantId, from, to, Role);

        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"reservas_{from:yyyyMMdd}_{to:yyyyMMdd}.xlsx");
    }

    [HttpGet("pdf")]
    public async Task<IActionResult> ExportPdf(
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to)
    {
        if (from > to)
            return BadRequest(new { message = "La fecha de inicio no puede ser mayor que la de fin." });

        var bytes = await _exportService.ExportStatsToPdfAsync(TenantId, from, to, Role);

        return File(bytes, "application/pdf",
            $"estadisticas_{from:yyyyMMdd}_{to:yyyyMMdd}.pdf");
    }
}