namespace BookingApp.Application.DTOs.Business;

public class StaffResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public bool IsActive { get; set; }
    public int TotalBookings { get; set; }
}