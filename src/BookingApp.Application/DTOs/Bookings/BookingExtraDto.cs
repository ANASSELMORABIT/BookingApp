namespace BookingApp.Application.DTOs.Bookings;

public class BookingExtraDto
{
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int ExtraMinutes { get; set; }
}
