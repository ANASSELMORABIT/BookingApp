using BookingApp.Application.DTOs.Bookings;

namespace BookingApp.Application.Interfaces;

public interface IBookingService
{
    Task<BookingResponseDto> CreateAsync(CreateBookingDto dto, Guid clientId, Guid tenantId, string role);
    Task<PublicBookingResultDto> CreatePublicAsync(PublicBookingDto dto);
    Task<IEnumerable<BookingResponseDto>> GetByClientAsync(Guid clientId);
    Task<IEnumerable<BookingResponseDto>> GetByBusinessAsync(Guid businessId, DateOnly from, DateOnly to, Guid tenantId, string role);
    Task<BookingResponseDto> CancelAsync(Guid bookingId, Guid clientId);
    Task<BookingResponseDto> MarkArrivedAsync(Guid bookingId, Guid tenantId, string role);
}
