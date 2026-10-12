using BookingApp.Application.DTOs.Profile;

namespace BookingApp.Application.Interfaces;

public interface IProfileService
{
    Task<ProfileResponseDto> GetProfileAsync(Guid userId);
    Task<ProfileResponseDto> UpdateProfileAsync(Guid userId, UpdateProfileDto dto);
    Task ChangePasswordAsync(Guid userId, ChangePasswordDto dto);
    Task UpdateUserRoleAsync(Guid requesterId, UpdateUserRoleDto dto);
}