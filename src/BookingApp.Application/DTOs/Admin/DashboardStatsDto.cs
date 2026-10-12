namespace BookingApp.Application.DTOs.Admin;

public class DashboardStatsDto
{
    public int TotalBookings { get; set; }
    public int BookingsToday { get; set; }
    public int BookingsThisWeek { get; set; }
    public int BookingsThisMonth { get; set; }
    public decimal RevenueTotal { get; set; }
    public decimal RevenueThisMonth { get; set; }
    public int CancelledBookings { get; set; }
    public double CancellationRate { get; set; }
    public IEnumerable<StaffStatsDto> StaffStats { get; set; } = new List<StaffStatsDto>();
    public IEnumerable<ServiceStatsDto> TopServices { get; set; } = new List<ServiceStatsDto>();
}