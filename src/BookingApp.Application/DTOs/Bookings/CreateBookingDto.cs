namespace BookingApp.Application.DTOs.Bookings;

public class CreateBookingDto
{
    public Guid ServiceId { get; set; }
    public Guid StaffId { get; set; }
    public DateTime StartTime { get; set; }
    public string? Notes { get; set; }
    /// <summary>Extras elegidos del servicio (opcional).</summary>
    public List<Guid> ExtraIds { get; set; } = new();
    /// <summary>El cliente ha leído y aceptado las normas del negocio.</summary>
    public bool AcceptPolicies { get; set; }
}