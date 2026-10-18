namespace BookingApp.Application.DTOs.Bookings;

public class BookingResponseDto
{
    public Guid Id { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public string StaffName { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string Status { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    /// <summary>Total a pagar: servicio + extras.</summary>
    public decimal Price { get; set; }
    public decimal BasePrice { get; set; }
    public List<BookingExtraDto> Extras { get; set; } = new();
    public string? Notes { get; set; }
    public DateTime? ArrivedAt { get; set; }
    /// <summary>El cliente estaba en la lista de avisos al reservar.</summary>
    public bool ClientFlagged { get; set; }
    /// <summary>Cancelar antes de esta hora no penaliza (null si el negocio no tiene esa norma).</summary>
    public DateTime? FreeCancellationUntil { get; set; }
}