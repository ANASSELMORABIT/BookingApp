using BookingApp.Application.DTOs.Availability;
using BookingApp.Application.DTOs.Bookings;
using BookingApp.Domain.Entities;

namespace BookingApp.Tests;

/// <summary>
/// Flujo completo de la página pública: una reserva ocupa la franja solo del empleado elegido,
/// no se puede repetir y la ve el negocio.
/// </summary>
public class PublicBookingFlowTests
{
    /// <summary>Negocio A con un segundo empleado y un servicio de 60 minutos.</summary>
    private static (TestData d, Staff otherStaff, Service oneHour) Setup()
    {
        var d = new TestData(); // 09:00–12:00
        var otherStaff = Staff.Create(d.BusinessA.Id, "Berta");
        var oneHour = Service.Create(d.BusinessA.Id, "Tratamiento facial", 60, 45m);
        d.Db.AddRange(otherStaff, oneHour);
        d.Db.SaveChanges();
        return (d, otherStaff, oneHour);
    }

    private static PublicBookingDto Public(Guid serviceId, Guid staffId, DateTime localStart, string email = "cliente@correo.com") => new()
    {
        ServiceId = serviceId,
        StaffId = staffId,
        StartTime = localStart,
        FullName = "Cliente Público",
        Email = email,
    };

    private static async Task<List<TimeSlotDto>> Slots(TestData d, Guid serviceId, Guid staffId) =>
        (await d.AvailabilityService().GetAvailableSlotsAsync(new AvailabilityRequestDto
        {
            ServiceId = serviceId, StaffId = staffId, Date = d.Day
        })).ToList();

    [Fact]
    public async Task PublicBooking_BlocksTheHourForThatStaff_ButNotForAnotherStaff()
    {
        var (d, berta, oneHour) = Setup();

        await d.BookingService().CreatePublicAsync(Public(oneHour.Id, d.StaffA.Id, d.Local(10)));

        var anaSlots = await Slots(d, oneHour.Id, d.StaffA.Id);
        var bertaSlots = await Slots(d, oneHour.Id, berta.Id);

        Assert.False(anaSlots.Single(s => s.StartTime == d.Local(10)).IsAvailable);
        Assert.True(bertaSlots.Single(s => s.StartTime == d.Local(10)).IsAvailable);
        Assert.All(bertaSlots, s => Assert.True(s.IsAvailable));
    }

    [Fact]
    public async Task OneHourBooking_BlocksBothHalfHourSlotsOfAShorterService()
    {
        var (d, _, oneHour) = Setup();

        // Reserva de 10:00 a 11:00; después alguien mira un servicio de 30 minutos con la misma persona
        await d.BookingService().CreatePublicAsync(Public(oneHour.Id, d.StaffA.Id, d.Local(10)));
        var halfHourSlots = await Slots(d, d.ServiceA.Id, d.StaffA.Id);

        var unavailable = halfHourSlots.Where(s => !s.IsAvailable).Select(s => s.StartTime).ToList();
        Assert.Equal(new[] { d.Local(10), d.Local(10, 30) }, unavailable);
        Assert.True(halfHourSlots.Single(s => s.StartTime == d.Local(9, 30)).IsAvailable);
        Assert.True(halfHourSlots.Single(s => s.StartTime == d.Local(11)).IsAvailable);
    }

    [Fact]
    public async Task SameStaffAndHour_IsRejected_WhileAnotherStaffCanTakeIt()
    {
        var (d, berta, oneHour) = Setup();
        var service = d.BookingService();

        await service.CreatePublicAsync(Public(oneHour.Id, d.StaffA.Id, d.Local(10)));

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreatePublicAsync(Public(oneHour.Id, d.StaffA.Id, d.Local(10), "otra@correo.com")));
        Assert.Equal("Ese horario ya está reservado.", error.Message);

        // Una reserva que empieza dentro de la hora ocupada también se rechaza
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreatePublicAsync(Public(d.ServiceA.Id, d.StaffA.Id, d.Local(10, 30), "otra@correo.com")));

        var other = await service.CreatePublicAsync(Public(oneHour.Id, berta.Id, d.Local(10), "otra@correo.com"));
        Assert.NotEqual(Guid.Empty, other.BookingId);
    }

    [Fact]
    public async Task PublicBooking_AppearsInTheBusinessBookings()
    {
        var (d, _, oneHour) = Setup();

        await d.BookingService().CreatePublicAsync(Public(oneHour.Id, d.StaffA.Id, d.Local(11)));

        var bookings = (await d.BookingService().GetByBusinessAsync(
            d.BusinessA.Id, d.Day, d.Day, d.TenantA.Id, "Owner")).ToList();

        var booking = Assert.Single(bookings);
        Assert.Equal("Cliente Público", booking.ClientName);
        Assert.Equal("Tratamiento facial", booking.ServiceName);
        Assert.Equal("Ana", booking.StaffName);
        Assert.Contains($"created:{d.TenantA.Id}", d.Notifications.Sent);
    }
}
