using BookingApp.Application.DTOs.Availability;
using BookingApp.Application.Interfaces;
using BookingApp.Domain.Enums;
using BookingApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BookingApp.Infrastructure.Services;

public class AvailabilityService : IAvailabilityService
{
    private readonly AppDbContext _context;

    public AvailabilityService(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Devuelve los huecos del día para un servicio y un empleado, en hora local del negocio.
    /// Los huecos duran lo mismo que el servicio y van desde la apertura hasta el cierre.
    /// </summary>
    public async Task<IEnumerable<TimeSlotDto>> GetAvailableSlotsAsync(AvailabilityRequestDto request)
    {
        var service = await _context.Services
            .Include(s => s.Business)
            .FirstOrDefaultAsync(s => s.Id == request.ServiceId && s.IsActive)
            ?? throw new InvalidOperationException("Servicio no encontrado.");

        var staffValid = await _context.Staff
            .AnyAsync(s => s.Id == request.StaffId && s.BusinessId == service.BusinessId && s.IsActive);
        if (!staffValid)
            throw new InvalidOperationException("El empleado no pertenece a este negocio.");

        // Apertura y cierre en hora local, convertidos a UTC (las reservas se guardan en UTC)
        var openUtc  = BusinessTime.LocalToUtc(request.Date.ToDateTime(service.Business.OpenTime));
        var closeUtc = BusinessTime.LocalToUtc(request.Date.ToDateTime(service.Business.CloseTime));

        var existingBookings = await _context.Bookings
            .Where(b => b.StaffId == request.StaffId
                     && b.Status != BookingStatus.Cancelled
                     && b.StartTime < closeUtc
                     && b.EndTime > openUtc)
            .ToListAsync();

        var now = DateTime.UtcNow;
        var slots = new List<TimeSlotDto>();
        var current = openUtc;

        while (current.AddMinutes(service.DurationMinutes) <= closeUtc)
        {
            var slotEnd = current.AddMinutes(service.DurationMinutes);

            slots.Add(new TimeSlotDto
            {
                StartTime   = BusinessTime.UtcToLocal(current),
                EndTime     = BusinessTime.UtcToLocal(slotEnd),
                IsAvailable = current > now && !existingBookings.Any(b => b.OverlapsWith(current, slotEnd))
            });

            current = slotEnd;
        }

        return slots;
    }
}
