namespace BookingApp.Application.DTOs.Bookings;

public class CreateBookingDto
{
    public Guid ServiceId { get; set; }
    public Guid StaffId { get; set; }
    public DateTime StartTime { get; set; }
    public string? Notes { get; set; }
}