namespace BookingApp.Application.DTOs.Availability;

public class AvailabilityRequestDto
{
    public Guid ServiceId { get; set; }
    public Guid StaffId { get; set; }
    public DateOnly Date { get; set; }
}