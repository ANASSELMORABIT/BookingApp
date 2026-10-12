namespace BookingApp.Application.DTOs.Admin;

public class BookingsByPeriodDto
{
    public DateOnly Date { get; set; }
    public int TotalBookings { get; set; }
    public int Confirmed { get; set; }
    public int Cancelled { get; set; }
    public decimal Revenue { get; set; }
}