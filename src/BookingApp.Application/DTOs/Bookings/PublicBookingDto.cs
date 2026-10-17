namespace BookingApp.Application.DTOs.Bookings;

/// <summary>Reserva desde la página pública, sin cuenta. StartTime en hora local del negocio.</summary>
public class PublicBookingDto
{
    public Guid ServiceId { get; set; }
    public Guid StaffId { get; set; }
    public DateTime StartTime { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Notes { get; set; }
}
