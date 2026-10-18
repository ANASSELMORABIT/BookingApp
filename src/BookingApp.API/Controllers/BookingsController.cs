using System.Security.Claims;
using BookingApp.Application.DTOs.Bookings;
using BookingApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookingApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public BookingsController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateBookingDto dto)
    {
        try
        {
            var clientId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var tenantId = Guid.Parse(User.FindFirstValue("tenant_id")!);

            var role = User.FindFirstValue(ClaimTypes.Role)!;

            var result = await _bookingService.CreateAsync(dto, clientId, tenantId, role);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyBookings()
    {
        var clientId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var bookings = await _bookingService.GetByClientAsync(clientId);
        return Ok(bookings);
    }

    // GET /api/Bookings/business/{id}?date=2026-05-20  o  ?from=2026-05-01&to=2026-05-31
    [HttpGet("business/{businessId}")]
    [Authorize(Policy = "OwnerOrStaff")]
    public async Task<IActionResult> GetByBusiness(
        Guid businessId,
        [FromQuery] DateOnly? date,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to)
    {
        var start = date ?? from;
        var end   = date ?? to ?? from;
        if (start is null || end is null)
            return BadRequest(new { message = "Indica 'date' o el rango 'from' y 'to'." });

        try
        {
            var tenantId = Guid.Parse(User.FindFirstValue("tenant_id")!);
            var role = User.FindFirstValue(ClaimTypes.Role)!;
            var bookings = await _bookingService.GetByBusinessAsync(businessId, start.Value, end.Value, tenantId, role);
            return Ok(bookings);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        try
        {
            var clientId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _bookingService.CancelAsync(id, clientId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // PUT /api/Bookings/{id}/arrived — el cliente ha llegado (evita la cancelación por retraso)
    [HttpPut("{id}/arrived")]
    [Authorize(Policy = "OwnerOrStaff")]
    public async Task<IActionResult> MarkArrived(Guid id)
    {
        try
        {
            var tenantId = Guid.Parse(User.FindFirstValue("tenant_id")!);
            var role = User.FindFirstValue(ClaimTypes.Role)!;
            return Ok(await _bookingService.MarkArrivedAsync(id, tenantId, role));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
