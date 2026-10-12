namespace BookingApp.Application.Interfaces;

public interface IEmailService
{
    Task SendBookingConfirmationAsync(string toEmail, string clientName,
        string serviceName, DateTime startTime);
    Task SendBookingReminderAsync(string toEmail, string clientName,
        string serviceName, DateTime startTime);
    Task SendBookingCancellationAsync(string toEmail, string clientName,
        string serviceName, DateTime startTime);
}