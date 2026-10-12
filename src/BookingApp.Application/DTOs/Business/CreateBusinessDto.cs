namespace BookingApp.Application.DTOs.Business;

public class CreateBusinessDto
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public TimeOnly OpenTime { get; set; }
    public TimeOnly CloseTime { get; set; }
}