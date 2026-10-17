using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
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

    // Identificadores que no se pueden usar al registrar un negocio
    private static readonly string[] ReservedSlugs = { "superadmin", "admin", "api", "www" };
    private static readonly Regex SlugPattern = new("^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$", RegexOptions.Compiled);

    /// <summary>
    /// Registra un negocio nuevo: crea el tenant y su primer usuario con rol Owner.
    /// No permite unirse a un tenant existente ni obtener el rol SuperAdmin.
    /// </summary>
    public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request)
    {
        var slug = request.Subdomain.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email))
            throw new InvalidOperationException("Nombre y email son obligatorios.");

        if (request.Password.Length < 8)
            throw new InvalidOperationException("La contraseña debe tener al menos 8 caracteres.");

        if (!SlugPattern.IsMatch(slug) || ReservedSlugs.Contains(slug))
            throw new InvalidOperationException(
                "Identificador de negocio no válido: usa de 3 a 50 letras minúsculas, números o guiones.");

        if (await _context.Tenants.AnyAsync(t => t.Subdomain == slug))
            throw new InvalidOperationException("Ese identificador de negocio ya está en uso.");

        var tenant = Tenant.Create(request.FullName.Trim() + "'s Business", slug);
        var user = AppUser.Create(tenant.Id, request.Email, request.FullName.Trim(), "Owner");
        user.SetPasswordHash(BCrypt.Net.BCrypt.HashPassword(request.Password));

        _context.Tenants.Add(tenant);
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return GenerateToken(user);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request)
    {
        // Mismo mensaje para tenant, email o contraseña incorrectos: no revela qué existe
        var tenant = await _context.Tenants
            .FirstOrDefaultAsync(t => t.Subdomain == request.Subdomain.Trim().ToLower())
            ?? throw new InvalidOperationException("Credenciales incorrectas.");

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email.Trim().ToLower() && u.TenantId == tenant.Id)
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