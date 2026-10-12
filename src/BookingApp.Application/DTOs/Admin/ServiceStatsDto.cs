namespace BookingApp.Application.DTOs.Admin;

public class ServiceStatsDto
{
    public Guid ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public int TotalBookings { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal Price { get; set; }
}