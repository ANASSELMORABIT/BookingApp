using BookingApp.Domain.Common;

namespace BookingApp.Domain.Entities;

public class Tenant : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string Subdomain { get; private set; } = string.Empty; // ej: "cuts-madrid"
    public string PlanType { get; private set; } = "free";
    public bool IsActive { get; private set; } = true;

    public ICollection<Business> Businesses { get; private set; } = new List<Business>();

    protected Tenant() { }

    public static Tenant Create(string name, string subdomain)
    {
        return new Tenant
        {
            Name = name,
            Subdomain = subdomain.ToLower().Trim()
        };
    }
}