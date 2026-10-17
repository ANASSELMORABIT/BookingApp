using BookingApp.Application.DTOs.Bookings;
using BookingApp.Infrastructure.Services;

namespace BookingApp.Tests;

public class BookingServiceTests
{
    private static CreateBookingDto Dto(TestData d, DateTime localStart) => new()
    {
        ServiceId = d.ServiceA.Id,
        StaffId   = d.StaffA.Id,
        StartTime = localStart
    };

    [Fact]
    public async Task Create_StoresStartTimeInUtc_FromBusinessLocalTime()
    {
        var d = new TestData();
        var local = d.Local(10);

        var result = await d.BookingService().CreateAsync(Dto(d, local), d.OwnerA.Id, d.TenantA.Id, "Owner");

        var expectedUtc = TimeZoneInfo.ConvertTimeToUtc(local, BusinessTime.Zone);
        Assert.Equal(expectedUtc, result.StartTime);
        Assert.Equal(expectedUtc.AddMinutes(30), result.EndTime);
        Assert.Contains($"created:{d.TenantA.Id}", d.Notifications.Sent);
    }

    [Fact]
    public async Task Create_Throws_WhenSlotOverlapsExistingBooking()
    {
        var d = new TestData();
        var service = d.BookingService();
        await service.CreateAsync(Dto(d, d.Local(10)), d.OwnerA.Id, d.TenantA.Id, "Owner");

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateAsync(Dto(d, d.Local(10, 15)), d.OwnerA.Id, d.TenantA.Id, "Owner"));
        Assert.Contains("reservado", ex.Message);
    }

    [Fact]
    public async Task Create_Allows_BackToBackBookings()
    {
        var d = new TestData();
        var service = d.BookingService();
        await service.CreateAsync(Dto(d, d.Local(10)), d.OwnerA.Id, d.TenantA.Id, "Owner");

        var second = await service.CreateAsync(Dto(d, d.Local(10, 30)), d.OwnerA.Id, d.TenantA.Id, "Owner");

        Assert.NotEqual(Guid.Empty, second.Id);
    }

    [Fact]
    public async Task Create_Throws_WhenServiceBelongsToAnotherTenant()
    {
        var d = new TestData();
        var dto = new CreateBookingDto { ServiceId = d.ServiceB.Id, StaffId = d.StaffB.Id, StartTime = d.Local(10) };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            d.BookingService().CreateAsync(dto, d.OwnerA.Id, d.TenantA.Id, "Owner"));
    }

    [Fact]
    public async Task Create_Throws_WhenStaffBelongsToAnotherBusiness()
    {
        var d = new TestData();
        var dto = new CreateBookingDto { ServiceId = d.ServiceA.Id, StaffId = d.StaffB.Id, StartTime = d.Local(10) };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            d.BookingService().CreateAsync(dto, d.OwnerA.Id, d.TenantA.Id, "Owner"));
    }

    [Theory]
    [InlineData(8, 30)]   // antes de abrir
    [InlineData(11, 45)]  // terminaría después del cierre (12:00)
    public async Task Create_Throws_WhenOutsideBusinessHours(int hour, int minute)
    {
        var d = new TestData();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            d.BookingService().CreateAsync(Dto(d, d.Local(hour, minute)), d.OwnerA.Id, d.TenantA.Id, "Owner"));
    }

    [Fact]
    public async Task Create_Throws_WhenStartIsInThePast()
    {
        var d = new TestData();
        var yesterday = DateTime.Now.AddDays(-1).Date.AddHours(10);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            d.BookingService().CreateAsync(Dto(d, yesterday), d.OwnerA.Id, d.TenantA.Id, "Owner"));
    }

    [Fact]
    public async Task CreatePublic_UsesSameTimeZoneAsAuthenticatedBooking_AndCreatesGuestInBusinessTenant()
    {
        var d = new TestData();
        var local = d.Local(11);

        var result = await d.BookingService().CreatePublicAsync(new PublicBookingDto
        {
            ServiceId = d.ServiceA.Id,
            StaffId   = d.StaffA.Id,
            StartTime = local,
            FullName  = "Cliente Invitado",
            Email     = "Invitado@Mail.com"
        });

        Assert.Equal(TimeZoneInfo.ConvertTimeToUtc(local, BusinessTime.Zone), result.StartTime);
        var guest = d.Db.Users.Single(u => u.Email == "invitado@mail.com");
        Assert.Equal(d.TenantA.Id, guest.TenantId);
        Assert.Equal("Client", guest.Role);
        Assert.Single(d.Email.Sent);
    }

    [Fact]
    public async Task GetByBusiness_Throws_ForBusinessOfAnotherTenant()
    {
        var d = new TestData();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            d.BookingService().GetByBusinessAsync(d.BusinessB.Id, d.Day, d.Day, d.TenantA.Id, "Owner"));
    }

    [Fact]
    public async Task GetByBusiness_ReturnsBookingsOfThatLocalDay()
    {
        var d = new TestData();
        var service = d.BookingService();
        await service.CreateAsync(Dto(d, d.Local(9)), d.OwnerA.Id, d.TenantA.Id, "Owner");

        var bookings = await service.GetByBusinessAsync(d.BusinessA.Id, d.Day, d.Day, d.TenantA.Id, "Owner");

        Assert.Single(bookings);
    }

    [Fact]
    public async Task GetByBusiness_ReturnsBookingsAcrossARange()
    {
        var d = new TestData();
        var service = d.BookingService();
        await service.CreateAsync(Dto(d, d.Local(9)), d.OwnerA.Id, d.TenantA.Id, "Owner");
        await service.CreateAsync(new CreateBookingDto
        {
            ServiceId = d.ServiceA.Id, StaffId = d.StaffA.Id,
            StartTime = d.Day.AddDays(2).ToDateTime(new TimeOnly(10, 0))
        }, d.OwnerA.Id, d.TenantA.Id, "Owner");

        var bookings = await service.GetByBusinessAsync(d.BusinessA.Id, d.Day, d.Day.AddDays(2), d.TenantA.Id, "Owner");

        Assert.Equal(2, bookings.Count());
    }

    [Fact]
    public async Task Cancel_FreesTheSlot()
    {
        var d = new TestData();
        var service = d.BookingService();
        var booking = await service.CreateAsync(Dto(d, d.Local(10)), d.OwnerA.Id, d.TenantA.Id, "Owner");

        await service.CancelAsync(booking.Id, d.OwnerA.Id);
        var again = await service.CreateAsync(Dto(d, d.Local(10)), d.OwnerA.Id, d.TenantA.Id, "Owner");

        Assert.NotEqual(booking.Id, again.Id);
    }
}
