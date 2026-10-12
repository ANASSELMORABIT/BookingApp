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
    
}