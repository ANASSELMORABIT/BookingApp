namespace BookingApp.Application.DTOs.Profile;

public class UpdateUserRoleDto
{
    public Guid UserId { get; set; }
    public string Role { get; set; } = string.Empty; // Owner | Staff | Client
}