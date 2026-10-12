using BookingApp.Application.DTOs.Availability;
using BookingApp.Application.DTOs.Bookings;
using BookingApp.Application.Interfaces;
using BookingApp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookingApp.API.Controllers;

[ApiController]
[Route("api/public")]
public class PublicController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAvailabilityService _availabilityService;
    private readonly IEmailService _emailService;

    public PublicController(
        AppDbContext context,
        IAvailabilityService availabilityService,
        IEmailService emailService)
    {
        _context = context;
        _availabilityService = availabilityService;
        _emailService = emailService;
    }

    // GET /api/public/business/:subdomain
    [HttpGet("business/{subdomain}")]
    public async Task<IActionResult> GetBusiness(string subdomain)
    {
        var tenant = await _context.Tenants
            .FirstOrDefaultAsync(t => t.Subdomain == subdomain.ToLower())
            ?? throw new InvalidOperationException("Negocio no encontrado.");

        var businesses = await _context.Businesses
            .Include(b => b.Services.Where(s => s.IsActive))
            .Include(b => b.Staff.Where(s => s.IsActive))
            .Where(b => b.TenantId == tenant.Id)
            .ToListAsync();

        return Ok(businesses.Select(b => new
        {
            b.Id,
            b.Name,
            b.Category,
            b.Phone,
            b.Address,
            OpenTime  = b.OpenTime.ToString("HH:mm"),
            CloseTime = b.CloseTime.ToString("HH:mm"),
            Services  = b.Services.Select(s => new
            {
                s.Id, s.Name, s.Description, s.DurationMinutes, s.Price
            }),
            Staff = b.Staff.Select(s => new
            {
                s.Id, s.Name
            })
        }));
    }

    // GET /api/public/availability
    [HttpGet("availability")]
    public async Task<IActionResult> GetAvailability([FromQuery] AvailabilityRequestDto request)
    {
        try
        {
            var slots = await _availabilityService.GetAvailableSlotsAsync(request);
            return Ok(slots);
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
            dto.StartTime = DateTime.SpecifyKind(dto.StartTime, DateTimeKind.Utc);

            var service = await _context.Services
                .Include(s => s.Business)
                .FirstOrDefaultAsync(s => s.Id == dto.ServiceId)
                ?? throw new InvalidOperationException("Servicio no encontrado.");

            var endTime = dto.StartTime.AddMinutes(service.DurationMinutes);

            var conflict = await _context.Bookings
                .AnyAsync(b => b.StaffId == dto.StaffId
                            && b.Status != Domain.Enums.BookingStatus.Cancelled
                            && b.StartTime < endTime
                            && b.EndTime > dto.StartTime);

            if (conflict)
                return BadRequest(new { message = "Ese horario ya está reservado." });

            // Buscar o crear usuario guest
            var tenant = service.Business.TenantId;
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == dto.Email.ToLower() && u.TenantId == tenant);

            if (user is null)
            {
                user = Domain.Entities.AppUser.Create(tenant, dto.Email, dto.FullName, "Client");
                user.SetPasswordHash(BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()));
                _context.Users.Add(user);
                await _context.SaveChangesAsync();
            }

            var booking = Domain.Entities.Booking.Create(
                dto.ServiceId, dto.StaffId, user.Id, dto.StartTime, service.DurationMinutes);

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            await _emailService.SendBookingConfirmationAsync(
                dto.Email, dto.FullName, service.Name, dto.StartTime);

            return Ok(new
            {
                bookingId   = booking.Id,
                serviceName = service.Name,
                startTime   = booking.StartTime,
                endTime     = booking.EndTime,
                message     = "Reserva creada correctamente. Recibirás un email de confirmación."
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

public class PublicBookingDto
{
    public Guid ServiceId { get; set; }
    public Guid StaffId { get; set; }
    public DateTime StartTime { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Notes { get; set; }
}