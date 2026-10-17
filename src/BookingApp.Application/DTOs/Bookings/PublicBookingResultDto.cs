namespace BookingApp.Application.DTOs.Bookings;

public class PublicBookingResultDto
{
    public Guid BookingId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string Message { get; set; } = string.Empty;
}
