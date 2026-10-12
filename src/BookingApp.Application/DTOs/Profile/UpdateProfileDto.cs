namespace BookingApp.Application.DTOs.Profile;

public class UpdateProfileDto
{
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
}