using BookingApp.Domain.Common;

namespace BookingApp.Domain.Entities;

public class Service : BaseEntity
{
    public Guid BusinessId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public int DurationMinutes { get; private set; }
    public decimal Price { get; private set; }
    public bool IsActive { get; private set; } = true;

    public Business Business { get; private set; } = null!;
    public ICollection<Booking> Bookings { get; private set; } = new List<Booking>();
    public ICollection<ServiceExtra> Extras { get; private set; } = new List<ServiceExtra>();

    protected Service() { }

    public static Service Create(Guid businessId, string name, int durationMinutes, decimal price)
    {
        return new Service
        {
            BusinessId = businessId,
            Name = name,
            DurationMinutes = durationMinutes,
            Price = price
        };
    }

    public void Update(string name, string? description, int durationMinutes, decimal price, bool isActive)
    {
        Name = name;
        Description = description;
        DurationMinutes = durationMinutes;
        Price = price;
        IsActive = isActive;
        SetUpdated();
    }
}