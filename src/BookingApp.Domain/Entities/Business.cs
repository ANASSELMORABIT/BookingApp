using BookingApp.Domain.Common;

namespace BookingApp.Domain.Entities;

public class Business : BaseEntity
{
    public Guid TenantId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Category { get; private set; } = string.Empty; // peluquería, gimnasio...
    public string? Phone { get; private set; }
    public string? Address { get; private set; }
    public TimeOnly OpenTime { get; private set; }
    public TimeOnly CloseTime { get; private set; }

    // ── Normas que el cliente ve y acepta al reservar ──
    /// <summary>"Ven sin acompañantes".</summary>
    public bool NoCompanionsPolicy { get; private set; } = true;
    /// <summary>Cancelar sola la reserva si el cliente no ha llegado pasados <see cref="LateToleranceMinutes"/>.</summary>
    public bool AutoCancelLate { get; private set; } = true;
    public int LateToleranceMinutes { get; private set; } = 10;
    /// <summary>Bloquear al cliente que cancela con menos de <see cref="CancellationNoticeHours"/> de antelación.</summary>
    public bool BlockLateCancellations { get; private set; } = true;
    public int CancellationNoticeHours { get; private set; } = 24;
    /// <summary>Norma adicional en texto libre (opcional).</summary>
    public string? ExtraPolicy { get; private set; }

    public bool HasPolicies => NoCompanionsPolicy || AutoCancelLate || BlockLateCancellations || !string.IsNullOrWhiteSpace(ExtraPolicy);

    public Tenant Tenant { get; private set; } = null!;
    public ICollection<Service> Services { get; private set; } = new List<Service>();
    public ICollection<Staff> Staff { get; private set; } = new List<Staff>();

    protected Business() { }

    public static Business Create(Guid tenantId, string name, string category,
        TimeOnly openTime, TimeOnly closeTime)
    {
        return new Business
        {
            TenantId = tenantId,
            Name = name,
            Category = category,
            OpenTime = openTime,
            CloseTime = closeTime
        };
    }

    public void Update(string name, string? phone, string? address, TimeOnly openTime, TimeOnly closeTime)
    {
        Name = name;
        Phone = phone;
        Address = address;
        OpenTime = openTime;
        CloseTime = closeTime;
        SetUpdated();
    }

    public void UpdatePolicies(bool noCompanions, bool autoCancelLate, int lateToleranceMinutes,
        bool blockLateCancellations, int cancellationNoticeHours, string? extraPolicy)
    {
        if (lateToleranceMinutes is < 5 or > 60)
            throw new InvalidOperationException("La tolerancia de retraso debe estar entre 5 y 60 minutos.");
        if (cancellationNoticeHours is < 1 or > 168)
            throw new InvalidOperationException("La antelación para cancelar debe estar entre 1 y 168 horas.");
        if (extraPolicy?.Trim().Length > 500)
            throw new InvalidOperationException("La norma adicional no puede superar los 500 caracteres.");

        NoCompanionsPolicy = noCompanions;
        AutoCancelLate = autoCancelLate;
        LateToleranceMinutes = lateToleranceMinutes;
        BlockLateCancellations = blockLateCancellations;
        CancellationNoticeHours = cancellationNoticeHours;
        ExtraPolicy = string.IsNullOrWhiteSpace(extraPolicy) ? null : extraPolicy.Trim();
        SetUpdated();
    }

    /// <summary>Cancelar antes de esta hora no tiene penalización (null si la norma está desactivada).</summary>
    public DateTime? FreeCancellationUntil(DateTime bookingStartUtc) =>
        BlockLateCancellations ? bookingStartUtc.AddHours(-CancellationNoticeHours) : null;
}