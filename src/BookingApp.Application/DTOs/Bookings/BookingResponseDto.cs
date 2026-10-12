namespace BookingApp.Application.DTOs.Bookings;

public class BookingResponseDto
{
    public Guid Id { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public string StaffName { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string Status { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? Notes { get; set; }
}