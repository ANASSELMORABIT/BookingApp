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

    public void UpdateRole(string role) // NUEVO
    {
        Role = role;
        SetUpdated();
    }
}