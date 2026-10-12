using System.Text;
using BookingApp.Application.Interfaces;
using BookingApp.Infrastructure.Jobs;
using BookingApp.Infrastructure.Persistence;
using BookingApp.Infrastructure.Services;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace BookingApp.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAvailabilityService, AvailabilityService>();
        services.AddScoped<IBookingService, BookingService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<IBusinessService, BusinessService>();
        services.AddScoped<IAdminService, AdminService>();
        services.AddScoped<BookingReminderJob>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IExportService, ExportService>();
        // services.AddSignalR();

        services.AddHangfire(config => config
            .UsePostgreSqlStorage(c =>
                c.UseNpgsqlConnection(
                    configuration.GetConnectionString("DefaultConnection"))));

        services.AddHangfireServer();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme) .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = configuration["Jwt:Issuer"],
            ValidAudience            = configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(configuration["Jwt:Key"]!))
        };

        // AÑADE ESTO — para SignalR WebSockets
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) &&
                    path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });
        services.AddAuthorization(options =>
        {
            options.AddPolicy("OwnerOnly", policy =>
                policy.RequireAssertion(context =>
                    context.User.HasClaim(System.Security.Claims.ClaimTypes.Role, "Owner") ||
                    context.User.HasClaim(System.Security.Claims.ClaimTypes.Role, "SuperAdmin")));

            options.AddPolicy("OwnerOrStaff", policy =>
                policy.RequireAssertion(context =>
                    context.User.HasClaim(System.Security.Claims.ClaimTypes.Role, "Owner") ||
                    context.User.HasClaim(System.Security.Claims.ClaimTypes.Role, "Staff") ||
                    context.User.HasClaim(System.Security.Claims.ClaimTypes.Role, "SuperAdmin")));

            options.AddPolicy("AllRoles", policy =>
                policy.RequireAssertion(context =>
                    context.User.HasClaim(System.Security.Claims.ClaimTypes.Role, "Owner") ||
                    context.User.HasClaim(System.Security.Claims.ClaimTypes.Role, "Staff") ||
                    context.User.HasClaim(System.Security.Claims.ClaimTypes.Role, "Client") ||
                    context.User.HasClaim(System.Security.Claims.ClaimTypes.Role, "SuperAdmin")));

            options.AddPolicy("SameTenantOnly", policy =>
                policy.RequireAssertion(context =>
                    context.User.HasClaim(System.Security.Claims.ClaimTypes.Role, "SuperAdmin") ||
                    !string.IsNullOrEmpty(context.User.FindFirst("tenant_id")?.Value)));
        });
        return services;
    }
}