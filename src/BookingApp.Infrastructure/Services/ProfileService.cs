using BookingApp.Application.DTOs.Profile;
using BookingApp.Application.Interfaces;
using BookingApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BookingApp.Infrastructure.Services;

public class ProfileService : IProfileService
{
    private readonly AppDbContext _context;

    public ProfileService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ProfileResponseDto> GetProfileAsync(Guid userId)
    {
        var user = await _context.Users
            .Include(u => u.Tenant)  // Necesitamos añadir esta navegación
            .FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new InvalidOperationException("Usuario no encontrado.");

        return MapToDto(user);
    }

    public async Task<ProfileResponseDto> UpdateProfileAsync(Guid userId, UpdateProfileDto dto)
    {
        var user = await _context.Users
            .Include(u => u.Tenant)
            .FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new InvalidOperationException("Usuario no encontrado.");

        user.UpdateProfile(dto.FullName, dto.Phone);
        await _context.SaveChangesAsync();

        return MapToDto(user);
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordDto dto)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new InvalidOperationException("Usuario no encontrado.");

        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            throw new InvalidOperationException("La contraseña actual es incorrecta.");

        if (dto.NewPassword.Length < 8)
            throw new InvalidOperationException("La nueva contraseña debe tener al menos 8 caracteres.");

        user.SetPasswordHash(BCrypt.Net.BCrypt.HashPassword(dto.NewPassword));
        await _context.SaveChangesAsync();
    }

    public async Task UpdateUserRoleAsync(Guid requesterId, UpdateUserRoleDto dto)
    {
        var requester = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == requesterId)
            ?? throw new InvalidOperationException("Usuario no encontrado.");

        if (requester.Role != "Owner")
            throw new UnauthorizedAccessException("Solo un Owner puede cambiar roles.");

        var validRoles = new[] { "Owner", "Staff", "Client" };
        if (!validRoles.Contains(dto.Role))
            throw new InvalidOperationException($"Rol inválido. Válidos: {string.Join(", ", validRoles)}");

        var targetUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == dto.UserId && u.TenantId == requester.TenantId)
            ?? throw new InvalidOperationException("Usuario no encontrado en tu tenant.");

        targetUser.UpdateRole(dto.Role);
        await _context.SaveChangesAsync();
    }

    private static ProfileResponseDto MapToDto(Domain.Entities.AppUser user) => new()
    {
        Id             = user.Id,
        FullName       = user.FullName,
        Email          = user.Email,
        Phone          = user.Phone,
        Role           = user.Role,
        TenantSubdomain = user.Tenant?.Subdomain ?? string.Empty,
        CreatedAt      = user.CreatedAt
    };
}