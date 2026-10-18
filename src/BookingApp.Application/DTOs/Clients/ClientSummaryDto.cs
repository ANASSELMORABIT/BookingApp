namespace BookingApp.Application.DTOs.Clients;

/// <summary>Cliente de un negocio con su historial (ausencias, aviso y bloqueo).</summary>
public class ClientSummaryDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public int TotalBookings { get; set; }
    public int NoShowCount { get; set; }
    public int CancelledCount { get; set; }
    public bool IsFlagged { get; set; }
    public bool IsBlocked { get; set; }
    public string? BlockedReason { get; set; }
    public DateTime? BlockedAt { get; set; }
    public DateTime? LastBookingAt { get; set; }
}

public class BlockClientDto
{
    public string? Reason { get; set; }
}
