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

    public Service Service { get; private set; } = null!;
    public Staff Staff { get; private set; } = null!;
    public AppUser Client { get; private set; } = null!;

    protected Booking() { }

    public static Booking Create(Guid serviceId, Guid staffId, Guid clientId,
        DateTime startTime, int durationMinutes)
    {
        return new Booking
        {
            ServiceId = serviceId,
            StaffId = staffId,
            ClientId = clientId,
            StartTime = startTime,
            EndTime = startTime.AddMinutes(durationMinutes)
        };
    }

    public void Confirm() => Status = BookingStatus.Confirmed;
    public void Cancel() => Status = BookingStatus.Cancelled;
    public void Complete() => Status = BookingStatus.Completed;
    public void MarkPaid() => PaymentStatus = PaymentStatus.Paid;
    public void MarkRefunded() => PaymentStatus = PaymentStatus.Refunded;

    public bool OverlapsWith(DateTime start, DateTime end)
        => StartTime < end && EndTime > start;
}