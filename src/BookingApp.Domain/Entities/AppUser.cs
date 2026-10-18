using BookingApp.Domain.Common;

namespace BookingApp.Domain.Entities;

public class AppUser : BaseEntity
{
    public Guid TenantId { get; private set; }
    public string Email { get; private set; } = string.Empty;
    public string FullName { get; private set; } = string.Empty;
    public string Role { get; private set; } = "Client";
    public string? Phone { get; private set; }
    public string PasswordHash { get; private set; } = string.Empty;

    // ── Historial del cliente en el negocio ──
    public int NoShowCount { get; private set; }
    /// <summary>En la lista de avisos: puede reservar, pero el negocio recibe una alerta.</summary>
    public bool IsFlagged { get; private set; }
    /// <summary>Bloqueado: no puede reservar hasta que el negocio lo desbloquee.</summary>
    public bool IsBlocked { get; private set; }
    public string? BlockedReason { get; private set; }
    public DateTime? BlockedAt { get; private set; }

    public Tenant? Tenant { get; private set; } // NUEVO — navegación

    public ICollection<Booking> Bookings { get; private set; } = new List<Booking>();

    protected AppUser() { }

    public static AppUser Create(Guid tenantId, string email, string fullName, string role = "Client")
    {
        return new AppUser
        {
            TenantId = tenantId,
            Email = email.ToLower().Trim(),
            FullName = fullName,
            Role = role
        };
    }

    public void SetPasswordHash(string hash)
    {
        PasswordHash = hash;
        SetUpdated();
    }

    public void UpdateProfile(string fullName, string? phone) // NUEVO
    {
        FullName = fullName;
        Phone = phone;
        SetUpdated();
    }

    /// <summary>No se presentó a una cita: pasa a la lista de avisos.</summary>
    public void RegisterNoShow()
    {
        NoShowCount++;
        IsFlagged = true;
        SetUpdated();
    }

    public void ClearFlag()
    {
        IsFlagged = false;
        SetUpdated();
    }

    public void Block(string reason, DateTime nowUtc)
    {
        IsBlocked = true;
        BlockedReason = reason.Length > 200 ? reason[..200] : reason;
        BlockedAt = nowUtc;
        SetUpdated();
    }

    public void Unblock()
    {
        IsBlocked = false;
        BlockedReason = null;
        BlockedAt = null;
        SetUpdated();
    }

    public void UpdateRole(string role) // NUEVO
    {
        Role = role;
        SetUpdated();
    }
}