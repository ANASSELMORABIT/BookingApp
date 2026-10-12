using BookingApp.Application.DTOs.Availability;

namespace BookingApp.Application.Interfaces;

public interface IAvailabilityService
{
    Task<IEnumerable<TimeSlotDto>> GetAvailableSlotsAsync(AvailabilityRequestDto request);
} 