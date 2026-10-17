using BookingApp.Application.DTOs.Availability;
using BookingApp.Application.DTOs.Bookings;

namespace BookingApp.Tests;

public class AvailabilityServiceTests
{
    [Fact]
    public async Task GetSlots_CoversWholeOpeningHours_IncludingLastSlot()
    {
        var d = new TestData(); // 09:00–12:00, servicio de 30 min

        var slots = (await d.AvailabilityService().GetAvailableSlotsAsync(new AvailabilityRequestDto
        {
            ServiceId = d.ServiceA.Id, StaffId = d.StaffA.Id, Date = d.Day
        })).ToList();

        Assert.Equal(6, slots.Count);
        Assert.Equal(d.Local(9), slots[0].StartTime);
        Assert.Equal(d.Local(11, 30), slots[^1].StartTime);
        Assert.Equal(d.Local(12), slots[^1].EndTime);
        Assert.All(slots, s => Assert.True(s.IsAvailable));
    }

    [Fact]
    public async Task GetSlots_MarksBookedSlotAsUnavailable()
    {
        var d = new TestData();
        await d.BookingService().CreateAsync(new CreateBookingDto
        {
            ServiceId = d.ServiceA.Id, StaffId = d.StaffA.Id, StartTime = d.Local(10)
        }, d.OwnerA.Id, d.TenantA.Id, "Owner");

        var slots = await d.AvailabilityService().GetAvailableSlotsAsync(new AvailabilityRequestDto
        {
            ServiceId = d.ServiceA.Id, StaffId = d.StaffA.Id, Date = d.Day
        });

        var unavailable = slots.Where(s => !s.IsAvailable).Select(s => s.StartTime).ToList();
        Assert.Equal(new[] { d.Local(10) }, unavailable);
    }

    [Fact]
    public async Task GetSlots_Throws_WhenStaffIsFromAnotherBusiness()
    {
        var d = new TestData();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            d.AvailabilityService().GetAvailableSlotsAsync(new AvailabilityRequestDto
            {
                ServiceId = d.ServiceA.Id, StaffId = d.StaffB.Id, Date = d.Day
            }));
    }
}
