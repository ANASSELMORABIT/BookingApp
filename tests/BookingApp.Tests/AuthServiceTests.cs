using System.IdentityModel.Tokens.Jwt;
using BookingApp.Application.DTOs.Auth;
using BookingApp.Infrastructure.Services;
using Microsoft.Extensions.Configuration;

namespace BookingApp.Tests;

public class AuthServiceTests
{
    private static AuthService CreateService(TestData d)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "clave-de-pruebas-solo-para-tests-0123456789",
                ["Jwt:Issuer"] = "BookingApp",
                ["Jwt:Audience"] = "BookingAppUsers",
                ["Jwt:ExpiryMinutes"] = "60"
            })
            .Build();
        return new AuthService(d.Db, config);
    }

    private static RegisterRequestDto Register(string slug) => new()
    {
        FullName = "Nueva Dueña",
        Email = "nueva@negocio.com",
        Password = "Password123!",
        Subdomain = slug
    };

    [Fact]
    public async Task Register_CreatesTenantAndOwner_WithTenantClaim()
    {
        var d = new TestData();

        var result = await CreateService(d).RegisterAsync(Register("Mi-Negocio"));

        Assert.Equal("Owner", result.Role);
        var tenant = d.Db.Tenants.Single(t => t.Subdomain == "mi-negocio");
        var token = new JwtSecurityTokenHandler().ReadJwtToken(result.Token);
        Assert.Equal(tenant.Id.ToString(), token.Claims.First(c => c.Type == "tenant_id").Value);
    }

    [Theory]
    [InlineData("superadmin")]
    [InlineData("admin")]
    public async Task Register_RejectsReservedSlugs(string slug)
    {
        var d = new TestData();

        await Assert.ThrowsAsync<InvalidOperationException>(() => CreateService(d).RegisterAsync(Register(slug)));
        Assert.DoesNotContain(d.Db.Users, u => u.Role == "SuperAdmin");
    }

    [Fact]
    public async Task Register_CannotJoinAnExistingTenant()
    {
        var d = new TestData();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            CreateService(d).RegisterAsync(Register(d.TenantA.Subdomain)));
        Assert.Single(d.Db.Users, u => u.TenantId == d.TenantA.Id);
    }

    [Theory]
    [InlineData("a")]
    [InlineData("con espacios")]
    [InlineData("-guion-inicial")]
    public async Task Register_RejectsInvalidSlugs(string slug)
    {
        var d = new TestData();

        await Assert.ThrowsAsync<InvalidOperationException>(() => CreateService(d).RegisterAsync(Register(slug)));
    }

    [Fact]
    public async Task Login_ReturnsSameError_ForUnknownTenantAndWrongPassword()
    {
        var d = new TestData();
        var service = CreateService(d);
        await service.RegisterAsync(Register("mi-negocio"));

        var unknownTenant = await Assert.ThrowsAsync<InvalidOperationException>(() => service.LoginAsync(new LoginRequestDto
            { Subdomain = "no-existe", Email = "nueva@negocio.com", Password = "Password123!" }));
        var wrongPassword = await Assert.ThrowsAsync<InvalidOperationException>(() => service.LoginAsync(new LoginRequestDto
            { Subdomain = "mi-negocio", Email = "nueva@negocio.com", Password = "incorrecta" }));

        Assert.Equal(unknownTenant.Message, wrongPassword.Message);
    }
}
