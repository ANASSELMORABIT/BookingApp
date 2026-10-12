namespace BookingApp.Application.DTOs.Payments;

public class PaymentResponseDto
{
    public string PaymentIntentId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "eur";
    public string Status { get; set; } = string.Empty;
}