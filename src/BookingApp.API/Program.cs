using BookingApp.API.Hubs;
using BookingApp.Application.Interfaces;
using BookingApp.Infrastructure;
using BookingApp.Infrastructure.Jobs;
using Hangfire;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Los secretos llegan por user-secrets (desarrollo) o variables de entorno (Docker/producción)
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
    throw new InvalidOperationException(
        "Falta 'Jwt:Key' (mínimo 32 caracteres). Configúralo con 'dotnet user-secrets set \"Jwt:Key\" ...' " +
        "o con la variable de entorno Jwt__Key.");

if (string.IsNullOrWhiteSpace(builder.Configuration.GetConnectionString("DefaultConnection")))
    throw new InvalidOperationException(
        "Falta 'ConnectionStrings:DefaultConnection'. Configúralo con user-secrets o variables de entorno.");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddSignalR();
builder.Services.AddScoped<INotificationHub, NotificationHubService>();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                     ?? new[] { "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Por defecto Hangfire solo permite el panel desde peticiones locales
app.UseHangfireDashboard("/hangfire");

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

RecurringJob.AddOrUpdate<BookingReminderJob>(
    "booking-reminders",
    job => job.SendRemindersAsync(),
    Cron.Hourly);

app.Run();
