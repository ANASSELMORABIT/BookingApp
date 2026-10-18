using BookingApp.Domain.Common;

namespace BookingApp.Domain.Entities;

/// <summary>
/// Extra elegido en una reserva. Guarda una copia del nombre, el precio y los minutos
/// en el momento de reservar: si después cambia o se borra el extra, la reserva no cambia.
/// </summary>
public class BookingExtra : BaseEntity
{
    public Guid BookingId { get; private set; }
    public Guid? ServiceExtraId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public decimal Price { get; private set; }
    public int ExtraMinutes { get; private set; }

    protected BookingExtra() { }

    internal static BookingExtra From(Guid bookingId, ServiceExtra extra) => new()
    {
        BookingId = bookingId,
        ServiceExtraId = extra.Id,
        Name = extra.Name,
        Price = extra.Price,
        ExtraMinutes = extra.ExtraMinutes,
    };
}
