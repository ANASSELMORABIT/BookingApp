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

   public async Task<IEnumerable<TimeSlotDto>> GetAvailableSlotsAsync(
    AvailabilityRequestDto request)
    {
        var service = await _context.Services
            .Include(s => s.Business)
            .FirstOrDefaultAsync(s => s.Id == request.ServiceId)
            ?? throw new InvalidOperationException("Servicio no encontrado.");

        var timeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Madrid");

        // Construir open/close en local y convertir a UTC directamente
        var openLocal  = request.Date.ToDateTime(service.Business.OpenTime);
        var closeLocal = request.Date.ToDateTime(service.Business.CloseTime);

        var current = TimeZoneInfo.ConvertTimeToUtc(openLocal,  timeZone);
        var end     = TimeZoneInfo.ConvertTimeToUtc(closeLocal, timeZone);


        // El rango de búsqueda de bookings usa estos mismos límites
        var existingBookings = await _context.Bookings
            .Where(b => b.StaffId == request.StaffId
                    && b.StartTime >= current   // <-- ya es UTC correcto
                    && b.EndTime   <= end
                    && b.Status != BookingStatus.Cancelled)
            .OrderBy(b => b.StartTime)
            .ToListAsync();


        
        Console.WriteLine($"********************* Buscando bookings entre {current} UTC y {end} UTC para staff {request.StaffId}");
        Console.WriteLine($"*********************Bookings encontrados: {existingBookings.Count}");
        foreach (var eb in existingBookings)
            Console.WriteLine($"*********************  → {eb.StartTime} - {eb.EndTime} | Status: {eb.Status} ***********************");
        var slots = new List<TimeSlotDto>();

        while (current.AddMinutes(service.DurationMinutes) < end)
        {
            var slotEnd = current.AddMinutes(service.DurationMinutes);

            // Convertir el UTC del slot a hora local de Madrid para devolverlo al frontend
            var slotStartLocal = TimeZoneInfo.ConvertTime(current, TimeZoneInfo.Utc, timeZone);
            var slotEndLocal = TimeZoneInfo.ConvertTime(slotEnd, TimeZoneInfo.Utc, timeZone);

            slots.Add(new TimeSlotDto
            {
                StartTime   = slotStartLocal,
                EndTime     = slotEndLocal,
                IsAvailable = !existingBookings.Any(b => b.OverlapsWith(current, slotEnd))
            });

            current = current.AddMinutes(service.DurationMinutes);
        }

        return slots;
    }
}