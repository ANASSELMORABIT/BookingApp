using BookingApp.Application.DTOs.Bookings;

namespace BookingApp.Application.Interfaces;

public interface IBookingService
{
    Task<BookingResponseDto> CreateAsync(CreateBookingDto dto, Guid clientId, Guid tenantId);
    Task<IEnumerable<BookingResponseDto>> GetByClientAsync(Guid clientId);
    Task<IEnumerable<BookingResponseDto>> GetByBusinessAsync(Guid businessId, DateOnly date);
    Task<BookingResponseDto> CancelAsync(Guid bookingId, Guid clientId);
}