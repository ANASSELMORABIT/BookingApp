using BookingApp.Domain.Common;

namespace BookingApp.Domain.Entities;

/// <summary>
/// Extra opcional de un servicio (p. ej. "Mascarilla de colágeno", +10 €, +15 min).
/// El cliente lo elige al reservar; suma precio y, si tiene minutos, alarga la cita.
/// </summary>
public class ServiceExtra : BaseEntity
{
    public const int MaxExtraMinutes = 240;

    public Guid ServiceId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public decimal Price { get; private set; }
    public int ExtraMinutes { get; private set; }
    public bool IsActive { get; private set; } = true;

    public Service Service { get; private set; } = null!;

    protected ServiceExtra() { }

    public static ServiceExtra Create(Guid serviceId, string name, decimal price, int extraMinutes)
    {
        var extra = new ServiceExtra { ServiceId = serviceId };
        extra.Apply(name, price, extraMinutes, true);
        return extra;
    }

    public void Update(string name, decimal price, int extraMinutes, bool isActive)
    {
        Apply(name, price, extraMinutes, isActive);
        SetUpdated();
    }

    private void Apply(string name, decimal price, int extraMinutes, bool isActive)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 100)
            throw new InvalidOperationException("El nombre del extra es obligatorio (máximo 100 caracteres).");
        if (price < 0 || price > 10_000)
            throw new InvalidOperationException("El precio del extra debe estar entre 0 y 10.000 €.");
        if (extraMinutes < 0 || extraMinutes > MaxExtraMinutes)
            throw new InvalidOperationException($"Los minutos extra deben estar entre 0 y {MaxExtraMinutes}.");

        Name = name.Trim();
        Price = decimal.Round(price, 2);
        ExtraMinutes = extraMinutes;
        IsActive = isActive;
    }
}
