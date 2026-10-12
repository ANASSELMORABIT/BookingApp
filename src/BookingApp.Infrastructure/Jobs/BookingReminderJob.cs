using BookingApp.Application.Interfaces;
using BookingApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BookingApp.Infrastructure.Jobs;

public class BookingReminderJob
{
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ILogger<BookingReminderJob> _logger;

    public BookingReminderJob(AppDbContext context, IEmailService emailService,
        ILogger<BookingReminderJob> logger)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task SendRemindersAsync()
    {
        var tomorrow = DateTime.UtcNow.AddHours(24);
        var window   = DateTime.UtcNow.AddHours(23);

        var bookings = await _context.Bookings
            .Include(b => b.Service)
            .Include(b => b.Client)
            .Where(b => b.StartTime >= window
                     && b.StartTime <= tomorrow
                     && b.Status == Domain.Enums.BookingStatus.Confirmed)
            .ToListAsync();

        foreach (var booking in bookings)
        {
            await _emailService.SendBookingReminderAsync(
                booking.Client.Email,
                booking.Client.FullName,
                booking.Service.Name,
                booking.StartTime);
        }

        _logger.LogInformation("[JOB] Recordatorios enviados: {Count}", bookings.Count);
    }
}