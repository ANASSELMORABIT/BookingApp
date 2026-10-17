using BookingApp.Domain.Entities;
using BookingApp.Domain.Enums;
using Xunit;

namespace BookingApp.Tests;

public class BookingDomainTests
{
    [Fact]
    public void Booking_OverlapsWith_ShouldReturnTrue_WhenOverlapping()
    {
        var booking = Booking.Create(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            new DateTime(2026, 5, 20, 10, 0, 0, DateTimeKind.Utc), 30);

        var overlaps = booking.OverlapsWith(
            new DateTime(2026, 5, 20, 10, 15, 0, DateTimeKind.Utc),
            new DateTime(2026, 5, 20, 10, 45, 0, DateTimeKind.Utc));

        Assert.True(overlaps);
    }

    [Fact]
    public void Booking_OverlapsWith_ShouldReturnFalse_WhenNotOverlapping()
    {
        var booking = Booking.Create(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            new DateTime(2026, 5, 20, 10, 0, 0, DateTimeKind.Utc), 30);

        var overlaps = booking.OverlapsWith(
            new DateTime(2026, 5, 20, 10, 30, 0, DateTimeKind.Utc),
            new DateTime(2026, 5, 20, 11, 0, 0, DateTimeKind.Utc));

        Assert.False(overlaps);
    }

    [Fact]
    public void Booking_Cancel_ShouldChangeStatus_ToCancelled()
    {
        var booking = Booking.Create(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            new DateTime(2026, 5, 20, 10, 0, 0, DateTimeKind.Utc), 30);

        booking.Cancel();

        Assert.Equal(BookingStatus.Cancelled, booking.Status);
    }
}