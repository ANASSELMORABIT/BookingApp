using BookingApp.Application.DTOs.Availability;
using BookingApp.Application.DTOs.Bookings;
using BookingApp.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace BookingApp.API.Controllers;

/// <summary>Endpoints sin autenticación para la página pública de reservas.</summary>
[ApiController]
[Route("api/public")]
public class PublicController : ControllerBase
{
    private readonly IBusinessService _businessService;
    private readonly IAvailabilityService _availabilityService;
    private readonly IBookingService _bookingService;

    public PublicController(
        IBusinessService businessService,
        IAvailabilityService availabilityService,
        IBookingService bookingService)
    {
        _businessService = businessService;
        _availabilityService = availabilityService;
        _bookingService = bookingService;
    }

    // GET /api/public/business/{slug}
    [HttpGet("business/{subdomain}")]
    public async Task<IActionResult> GetBusiness(string subdomain)
    {
        try
        {
            return Ok(await _businessService.GetPublicBusinessesAsync(subdomain));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // GET /api/public/availability
    [HttpGet("availability")]
    public async Task<IActionResult> GetAvailability([FromQuery] AvailabilityRequestDto request)
    {
        try
        {
            return Ok(await _availabilityService.GetAvailableSlotsAsync(request));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // POST /api/public/book
    [HttpPost("book")]
    public async Task<IActionResult> Book([FromBody] PublicBookingDto dto)
    {
        try
        {
            return Ok(await _bookingService.CreatePublicAsync(dto));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
