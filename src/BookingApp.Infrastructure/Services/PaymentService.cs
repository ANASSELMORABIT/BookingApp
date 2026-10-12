using BookingApp.Application.DTOs.Payments;
using BookingApp.Application.Interfaces;
using BookingApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Stripe;

namespace BookingApp.Infrastructure.Services;

public class PaymentService : IPaymentService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _config;

    public PaymentService(AppDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
        StripeConfiguration.ApiKey = _config["Stripe:SecretKey"];
    }

    public async Task<PaymentResponseDto> CreatePaymentIntentAsync(
        CreatePaymentDto dto, Guid clientId)
    {
        var booking = await _context.Bookings
            .Include(b => b.Service)
            .Include(b => b.Client)
            .FirstOrDefaultAsync(b => b.Id == dto.BookingId && b.ClientId == clientId)
            ?? throw new InvalidOperationException("Reserva no encontrada.");

        var options = new PaymentIntentCreateOptions
        {
            Amount = (long)(booking.Service.Price * 100), // Stripe usa céntimos
            Currency = "eur",
            Metadata = new Dictionary<string, string>
            {
                { "booking_id", booking.Id.ToString() },
                { "client_id", clientId.ToString() }
            }
        };

        var service = new PaymentIntentService();
        var intent = await service.CreateAsync(options);

        return new PaymentResponseDto
        {
            PaymentIntentId = intent.Id,
            ClientSecret    = intent.ClientSecret,
            Amount          = booking.Service.Price,
            Currency        = "eur",
            Status          = intent.Status
        };
    }

    public async Task HandleWebhookAsync(string payload, string signature)
    {
        var webhookSecret = _config["Stripe:WebhookSecret"]!;

        var stripeEvent = EventUtility.ConstructEvent(
            payload, signature, webhookSecret);

        if (stripeEvent.Type == "payment_intent.succeeded")
        {
            var intent = stripeEvent.Data.Object as PaymentIntent;
            if (intent?.Metadata.TryGetValue("booking_id", out var bookingIdStr) == true
                && Guid.TryParse(bookingIdStr, out var bookingId))
            {
                var booking = await _context.Bookings.FindAsync(bookingId);
                if (booking is not null)
                {
                    booking.MarkPaid();
                    booking.Confirm();
                    booking.SetUpdated();
                    await _context.SaveChangesAsync();
                }
            }
        }
    }
}