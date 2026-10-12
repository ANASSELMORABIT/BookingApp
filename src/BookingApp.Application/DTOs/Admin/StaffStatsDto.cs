namespace BookingApp.Application.DTOs.Admin;

public class StaffStatsDto
{
    public Guid StaffId { get; set; }
    public string StaffName { get; set; } = string.Empty;
    public int TotalBookings { get; set; }
    public int CompletedBookings { get; set; }
    public int CancelledBookings { get; set; }
    public decimal Revenue { get; set; }
}