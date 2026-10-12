using BookingApp.Domain.Common;

namespace BookingApp.Domain.Entities;

public class Staff : BaseEntity
{
    public Guid BusinessId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Email { get; private set; }
    public bool IsActive { get; private set; } = true;

    public Business Business { get; private set; } = null!;
    public ICollection<Booking> Bookings { get; private set; } = new List<Booking>();

    protected Staff() { }

    public static Staff Create(Guid businessId, string name, string? email = null)
    {
        return new Staff
        {
            BusinessId = businessId,
            Name = name,
            Email = email
        };
    }

    public void Toggle()
    {
        IsActive = !IsActive;
        SetUpdated();
    }
}