namespace BookingApp.Application.DTOs.Business;

/// <summary>Normas del negocio que el cliente ve y acepta al reservar.</summary>
public class BusinessPoliciesDto
{
    public bool NoCompanionsPolicy { get; set; } = true;
    public bool AutoCancelLate { get; set; } = true;
    public int LateToleranceMinutes { get; set; } = 10;
    public bool BlockLateCancellations { get; set; } = true;
    public int CancellationNoticeHours { get; set; } = 24;
    public string? ExtraPolicy { get; set; }
}
