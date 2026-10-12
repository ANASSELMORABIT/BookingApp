using BookingApp.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace BookingApp.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;

    public EmailService(ILogger<EmailService> logger)
    {
        _logger = logger;
    }

    public Task SendBookingConfirmationAsync(string toEmail, string clientName,
        string serviceName, DateTime startTime)
    {
        _logger.LogInformation(
            "[EMAIL] Confirmación enviada a {Email} — {Service} el {Date}",
            toEmail, serviceName, startTime.ToString("dd/MM/yyyy HH:mm"));
        return Task.CompletedTask;
    }

    public Task SendBookingReminderAsync(string toEmail, string clientName,
        string serviceName, DateTime startTime)
    {
        _logger.LogInformation(
            "[EMAIL] Recordatorio enviado a {Email} — {Service} el {Date}",
            toEmail, serviceName, startTime.ToString("dd/MM/yyyy HH:mm"));
        return Task.CompletedTask;
    }

    public Task SendBookingCancellationAsync(string toEmail, string clientName,
        string serviceName, DateTime startTime)
    {
        _logger.LogInformation(
            "[EMAIL] Cancelación enviada a {Email} — {Service} el {Date}",
            toEmail, serviceName, startTime.ToString("dd/MM/yyyy HH:mm"));
        return Task.CompletedTask;
    }
}