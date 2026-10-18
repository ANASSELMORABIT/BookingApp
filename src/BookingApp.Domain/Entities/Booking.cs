using BookingApp.Domain.Common;
using BookingApp.Domain.Enums;

namespace BookingApp.Domain.Entities;

public class Booking : BaseEntity
{
    public Guid ServiceId { get; private set; }
    public Guid StaffId { get; private set; }
    public Guid ClientId { get; private set; }
    public DateTime StartTime { get; private set; }
    public DateTime EndTime { get; private set; }
    public BookingStatus Status { get; private set; } = BookingStatus.Pending;
    public PaymentStatus PaymentStatus { get; private set; } = PaymentStatus.Unpaid;
    public string? Notes { get; private set; }

    /// <summary>Precio del servicio más los extras elegidos, fijado al reservar.</summary>
    public decimal TotalPrice { get; private set; }
    /// <summary>Hora en la que el negocio marcó que el cliente ha llegado.</summary>
    public DateTime? ArrivedAt { get; private set; }
    public DateTime? CancelledAt { get; private set; }
    /// <summary>El cliente estaba en la lista de avisos cuando hizo esta reserva.</summary>
    public bool ClientFlagged { get; private set; }

    public Service Service { get; private set; } = null!;
    public Staff Staff { get; private set; } = null!;
    public AppUser Client { get; private set; } = null!;
    public ICollection<BookingExtra> Extras { get; private set; } = new List<BookingExtra>();

    protected Booking() { }

    public static Booking Create(Guid serviceId, Guid staffId, Guid clientId,
        DateTime startTime, int durationMinutes, string? notes = null)
    {
        if (durationMinutes <= 0)
            throw new ArgumentOutOfRangeException(nameof(durationMinutes), "La duración debe ser positiva.");

        if (notes?.Length > 500)
            throw new InvalidOperationException("Las notas no pueden superar los 500 caracteres.");

        return new Booking
        {
            ServiceId = serviceId,
            StaffId = staffId,
            ClientId = clientId,
            StartTime = startTime,
            EndTime = startTime.AddMinutes(durationMinutes),
            Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim()
        };
    }

    /// <summary>
    /// Fija el precio total (servicio + extras) y guarda una copia de cada extra elegido.
    /// La duración ya debe incluir los minutos de los extras.
    /// </summary>
    public void ApplyPricing(decimal servicePrice, IEnumerable<ServiceExtra> extras)
    {
        Extras.Clear();
        decimal total = servicePrice;
        foreach (var extra in extras)
        {
            Extras.Add(BookingExtra.From(Id, extra));
            total += extra.Price;
        }
        TotalPrice = total;
    }

    public void MarkClientFlagged() => ClientFlagged = true;

    public bool IsActive => Status is BookingStatus.Pending or BookingStatus.Confirmed;

    /// <summary>El negocio marca que el cliente ha llegado (evita la cancelación automática).</summary>
    public void MarkArrived(DateTime nowUtc)
    {
        if (!IsActive)
            throw new InvalidOperationException("Solo se puede marcar la llegada de una reserva pendiente o confirmada.");
        if (nowUtc < StartTime.AddHours(-2))
            throw new InvalidOperationException("Aún es pronto para marcar la llegada de esta reserva.");
        ArrivedAt ??= nowUtc;
        Status = BookingStatus.Confirmed;
        SetUpdated();
    }

    /// <summary>El cliente no llegó dentro del margen: la reserva se cancela como "no presentado".</summary>
    public void MarkNoShow(DateTime nowUtc)
    {
        if (!IsActive || ArrivedAt is not null)
            throw new InvalidOperationException("Esta reserva no se puede marcar como no presentada.");
        Status = BookingStatus.NoShow;
        CancelledAt = nowUtc;
        SetUpdated();
    }

    public void Confirm() => Status = BookingStatus.Confirmed;
    public void Cancel()
    {
        Status = BookingStatus.Cancelled;
        CancelledAt = DateTime.UtcNow;
    }
    public void Complete() => Status = BookingStatus.Completed;
    public void MarkPaid() => PaymentStatus = PaymentStatus.Paid;
    public void MarkRefunded() => PaymentStatus = PaymentStatus.Refunded;

    public bool OverlapsWith(DateTime start, DateTime end)
        => StartTime < end && EndTime > start;
}
