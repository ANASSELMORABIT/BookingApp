namespace BookingApp.Application.DTOs.Business;

public class BusinessResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string OpenTime { get; set; } = string.Empty;
    public string CloseTime { get; set; } = string.Empty;
    public int TotalServices { get; set; }
    public int TotalStaff { get; set; }
}