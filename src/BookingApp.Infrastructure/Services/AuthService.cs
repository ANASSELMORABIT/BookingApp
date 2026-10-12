using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BookingApp.Application.DTOs.Auth;
using BookingApp.Application.Interfaces;
using BookingApp.Domain.Entities;
using BookingApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace BookingApp.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request)
    {
        var tenant = await _context.Tenants
            .FirstOrDefaultAsync(t => t.Subdomain == request.Subdomain.ToLower());

        if (tenant is null)
        {
            tenant = Tenant.Create(request.FullName + "'s Business", request.Subdomain);
            _context.Tenants.Add(tenant);
            await _context.SaveChangesAsync();
        }

        var exists = await _context.Users
            .AnyAsync(u => u.Email == request.Email.ToLower() && u.TenantId == tenant.Id);

        if (exists)
            throw new InvalidOperationException("Email ya registrado en este tenant.");

        // SuperAdmin si el subdominio es "superadmin"
        var role = request.Subdomain.ToLower() == "superadmin" ? "SuperAdmin" : "Owner";

        var user = AppUser.Create(tenant.Id, request.Email, request.FullName, role);
        user.SetPasswordHash(BCrypt.Net.BCrypt.HashPassword(request.Password));

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return GenerateToken(user);
    }
    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request)
    {
        var tenant = await _context.Tenants
            .FirstOrDefaultAsync(t => t.Subdomain == request.Subdomain.ToLower())
            ?? throw new InvalidOperationException("Tenant no encontrado.");

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email.ToLower() && u.TenantId == tenant.Id)
            ?? throw new InvalidOperationException("Credenciales incorrectas.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new InvalidOperationException("Credenciales incorrectas.");

        return GenerateToken(user);
    }

    private AuthResponseDto GenerateToken(AppUser user)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));

        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiry = DateTime.UtcNow.AddMinutes(
            double.Parse(_config["Jwt:ExpiryMinutes"]!));

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("tenant_id", user.TenantId.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: expiry,
            signingCredentials: creds);

        return new AuthResponseDto
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role,
            ExpiresAt = expiry
        };
    }
}