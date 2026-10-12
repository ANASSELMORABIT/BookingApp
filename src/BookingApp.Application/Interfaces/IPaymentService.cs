using BookingApp.Application.DTOs.Payments;

namespace BookingApp.Application.Interfaces;

public interface IPaymentService
{
    Task<PaymentResponseDto> CreatePaymentIntentAsync(CreatePaymentDto dto, Guid clientId);
    Task HandleWebhookAsync(string payload, string signature);
}