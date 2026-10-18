using BookingApp.Application.DTOs.Availability;
using BookingApp.Application.DTOs.Bookings;
using BookingApp.Application.DTOs.Business;
using BookingApp.Domain.Entities;
using BookingApp.Domain.Enums;
using BookingApp.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace BookingApp.Tests;

/// <summary>Extras de pago, normas del negocio, cancelación por retraso, lista de avisos y bloqueos.</summary>
public class ExtrasAndPoliciesTests
{
    // TestData: negocio A abre de 9:00 a 12:00; "Corte" dura 30 min y cuesta 15 €

    private static ServiceExtra AddExtra(TestData d, Service service, string name = "Mascarilla", decimal price = 10m, int minutes = 15, bool active = true)
    {
        var extra = ServiceExtra.Create(service.Id, name, price, minutes);
        if (!active) extra.Update(name, price, minutes, false);
        d.Db.ServiceExtras.Add(extra);
        d.Db.SaveChanges();
        return extra;
    }

    private static PublicBookingDto Public(TestData d, DateTime localStart, string email = "cliente@a.com", params Guid[] extras) => new()
    {
        ServiceId = d.ServiceA.Id,
        StaffId = d.StaffA.Id,
        StartTime = localStart,
        FullName = "Cliente Público",
        Email = email,
        ExtraIds = extras.ToList(),
        AcceptPolicies = true,
    };

    // ── Extras ─────────────────────────────────────────────────────────

    [Fact]
    public async Task Extras_AddToTheTotal_AndLengthenTheBooking()
    {
        var d = new TestData();
        var mask = AddExtra(d, d.ServiceA, "Mascarilla", 10m, 15);
        var serum = AddExtra(d, d.ServiceA, "Sérum", 5.5m, 0);

        var result = await d.BookingService().CreatePublicAsync(Public(d, d.Local(10), "cliente@a.com", mask.Id, serum.Id));

        Assert.Equal(15m, result.BasePrice);
        Assert.Equal(30.5m, result.TotalPrice);
        Assert.Equal(2, result.Extras.Count);
        Assert.Equal(45, (result.EndTime - result.StartTime).TotalMinutes); // 30 + 15

        var saved = await d.Db.Bookings.Include(b => b.Extras).SingleAsync();
        Assert.Equal(30.5m, saved.TotalPrice);
        Assert.Contains(saved.Extras, e => e.Name == "Mascarilla" && e.Price == 10m);
    }

    [Fact]
    public async Task Extra_FromAnotherService_OrInactive_IsRejected()
    {
        var d = new TestData();
        var otherService = Service.Create(d.BusinessA.Id, "Tinte", 60, 40m);
        d.Db.Services.Add(otherService);
        d.Db.SaveChanges();
        var foreign = AddExtra(d, otherService);
        var inactive = AddExtra(d, d.ServiceA, "Antiguo", 3m, 0, active: false);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            d.BookingService().CreatePublicAsync(Public(d, d.Local(10), "cliente@a.com", foreign.Id)));
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            d.BookingService().CreatePublicAsync(Public(d, d.Local(10), "cliente@a.com", inactive.Id)));
        Assert.Empty(d.Db.Bookings);
    }

    [Fact]
    public async Task Availability_WithExtras_UsesTheLongerDuration()
    {
        var d = new TestData();
        var mask = AddExtra(d, d.ServiceA, minutes: 15);
        // Ya hay una reserva de 10:30 a 11:00
        await d.BookingService().CreatePublicAsync(Public(d, d.Local(10, 30), "otro@a.com"));

        var request = new AvailabilityRequestDto { ServiceId = d.ServiceA.Id, StaffId = d.StaffA.Id, Date = d.Day };
        var plain = (await d.AvailabilityService().GetAvailableSlotsAsync(request)).ToList();
        request.ExtraIds = new List<Guid> { mask.Id };
        var withExtra = (await d.AvailabilityService().GetAvailableSlotsAsync(request)).ToList();

        // 10:00–10:30 cabe sin extras; 10:00–10:45 se solapa con la de 10:30
        Assert.True(plain.Single(s => s.StartTime == d.Local(10)).IsAvailable);
        Assert.False(withExtra.Single(s => s.StartTime == d.Local(10)).IsAvailable);
        // Ningún hueco pasa del cierre: el último empieza a las 11:00 y acaba a las 11:45 (11:30 ya no cabe)
        Assert.All(withExtra, s => Assert.True(s.EndTime <= d.Local(12)));
        Assert.Equal(d.Local(11), withExtra.Last().StartTime);
        Assert.Equal(d.Local(11, 45), withExtra.Last().EndTime);
    }

    [Fact]
    public async Task Extras_ThatPassClosingTime_AreRejected()
    {
        var d = new TestData();
        var mask = AddExtra(d, d.ServiceA, minutes: 15);

        // 11:30 + 30 min + 15 min = 12:15 > cierre (12:00)
        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            d.BookingService().CreatePublicAsync(Public(d, d.Local(11, 30), "cliente@a.com", mask.Id)));
        Assert.Equal("La hora está fuera del horario del negocio.", error.Message);
    }

    // ── Normas ─────────────────────────────────────────────────────────

    [Fact]
    public async Task Booking_WithoutAcceptingPolicies_IsRejected()
    {
        var d = new TestData();
        var dto = Public(d, d.Local(10));
        dto.AcceptPolicies = false;

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => d.BookingService().CreatePublicAsync(dto));
        Assert.Equal(BookingService.PoliciesMessage, error.Message);

        await Assert.ThrowsAsync<InvalidOperationException>(() => d.BookingService().CreateAsync(new CreateBookingDto
        {
            ServiceId = d.ServiceA.Id, StaffId = d.StaffA.Id, StartTime = d.Local(10)
        }, d.OwnerA.Id, d.TenantA.Id, "Owner"));
    }

    [Fact]
    public async Task Business_WithoutPolicies_DoesNotAskForAcceptance()
    {
        var d = new TestData();
        d.BusinessA.UpdatePolicies(false, false, 10, false, 24, null);
        d.Db.SaveChanges();
        var dto = Public(d, d.Local(10));
        dto.AcceptPolicies = false;

        var result = await d.BookingService().CreatePublicAsync(dto);
        Assert.NotEqual(Guid.Empty, result.BookingId);
    }

    [Fact]
    public async Task UpdatePolicies_ValidatesValues_AndOnlyForItsOwnBusiness()
    {
        var d = new TestData();
        var policies = new BusinessPoliciesDto { LateToleranceMinutes = 15, CancellationNoticeHours = 12, ExtraPolicy = "Llega 5 minutos antes" };

        var saved = await d.BusinessService().UpdatePoliciesAsync(d.BusinessA.Id, policies, d.TenantA.Id, "Owner");
        Assert.Equal(15, saved.LateToleranceMinutes);
        Assert.Equal("Llega 5 minutos antes", saved.ExtraPolicy);

        await Assert.ThrowsAsync<InvalidOperationException>(() => d.BusinessService().UpdatePoliciesAsync(
            d.BusinessA.Id, new BusinessPoliciesDto { LateToleranceMinutes = 0 }, d.TenantA.Id, "Owner"));
        // El negocio A no puede tocar las normas del negocio B
        await Assert.ThrowsAsync<InvalidOperationException>(() => d.BusinessService().UpdatePoliciesAsync(
            d.BusinessB.Id, policies, d.TenantA.Id, "Owner"));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => d.BusinessService().UpdatePoliciesAsync(
            d.BusinessA.Id, policies, d.TenantA.Id, "Staff"));
    }

    // ── Cancelar sin aviso → bloqueo ──────────────────────────────────

    [Fact]
    public async Task CancellingWithoutNotice_BlocksTheClient_AndTheyCannotBookAgain()
    {
        var d = new TestData();
        var client = d.AddClient("cliente@a.com");
        var booking = d.AddBookingAtUtc(DateTime.UtcNow.AddHours(3), client); // menos de 24 h

        await d.BookingService().CancelAsync(booking.Id, client.Id);

        Assert.True(client.IsBlocked);
        Assert.Contains(d.Notifications.Alerts, a => a.Title == "Cliente bloqueado");

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            d.BookingService().CreatePublicAsync(Public(d, d.Local(10), "Cliente@A.com")));
        Assert.Equal(BookingService.BlockedMessage, error.Message);
        await Assert.ThrowsAsync<InvalidOperationException>(() => d.BookingService().CreateAsync(new CreateBookingDto
        {
            ServiceId = d.ServiceA.Id, StaffId = d.StaffA.Id, StartTime = d.Local(10), AcceptPolicies = true
        }, client.Id, d.TenantA.Id, "Client"));
    }

    [Fact]
    public async Task CancellingInTime_DoesNotBlock()
    {
        var d = new TestData();
        var client = d.AddClient();
        var booking = d.AddBookingAtUtc(DateTime.UtcNow.AddDays(5), client);

        var result = await d.BookingService().CancelAsync(booking.Id, client.Id);

        Assert.Equal("Cancelled", result.Status);
        Assert.False(client.IsBlocked);
    }

    [Fact]
    public async Task Staff_CancellingTheirOwnLastMinuteBooking_IsNotBlocked()
    {
        var d = new TestData();
        var booking = d.AddBookingAtUtc(DateTime.UtcNow.AddHours(2), d.OwnerA);

        await d.BookingService().CancelAsync(booking.Id, d.OwnerA.Id);

        Assert.False(d.OwnerA.IsBlocked);
    }

    [Fact]
    public async Task UnblockedClient_CanBookAgain()
    {
        var d = new TestData();
        var client = d.AddClient("cliente@a.com");
        client.Block("Prueba", DateTime.UtcNow);
        d.Db.SaveChanges();

        var summary = await d.ClientService().UnblockAsync(client.Id, d.TenantA.Id);
        Assert.False(summary.IsBlocked);

        var result = await d.BookingService().CreatePublicAsync(Public(d, d.Local(10), "cliente@a.com"));
        Assert.NotEqual(Guid.Empty, result.BookingId);
    }

    // ── Retraso → no presentado y lista de avisos ─────────────────────

    [Fact]
    public async Task LateBookingJob_CancelsAfterTheTolerance_AndFlagsTheClient()
    {
        var d = new TestData();
        var client = d.AddClient();
        var now = DateTime.UtcNow;
        var late = d.AddBookingAtUtc(now.AddMinutes(-11), client);

        var cancelled = await d.LateBookingJob().RunAsync(now);

        Assert.Equal(1, cancelled);
        Assert.Equal(BookingStatus.NoShow, late.Status);
        Assert.True(client.IsFlagged);
        Assert.Equal(1, client.NoShowCount);
        Assert.Contains(d.Notifications.Alerts, a => a.Title == "Cliente no presentado" && a.TenantId == d.TenantA.Id);
    }

    [Fact]
    public async Task LateBookingJob_LeavesBookingsWithinTolerance_ArrivedOrWithTheRuleOff()
    {
        var d = new TestData();
        var client = d.AddClient();
        var now = DateTime.UtcNow;
        var withinTolerance = d.AddBookingAtUtc(now.AddMinutes(-5), client);
        var arrived = d.AddBookingAtUtc(now.AddMinutes(-40), client);
        arrived.MarkArrived(now.AddMinutes(-41));
        d.Db.SaveChanges();

        Assert.Equal(0, await d.LateBookingJob().RunAsync(now));
        Assert.Equal(BookingStatus.Pending, withinTolerance.Status);
        Assert.Equal(BookingStatus.Confirmed, arrived.Status);

        d.BusinessA.UpdatePolicies(true, false, 10, true, 24, null);
        d.Db.SaveChanges();
        Assert.Equal(0, await d.LateBookingJob().RunAsync(now.AddMinutes(30)));
        Assert.False(client.IsFlagged);
    }

    [Fact]
    public async Task FlaggedClient_CanBook_ButTheBookingIsMarked_AndTheBusinessIsAlerted()
    {
        var d = new TestData();
        var client = d.AddClient("cliente@a.com");
        client.RegisterNoShow();
        d.Db.SaveChanges();

        var result = await d.BookingService().CreatePublicAsync(Public(d, d.Local(10), "cliente@a.com"));

        var booking = await d.Db.Bookings.SingleAsync(b => b.Id == result.BookingId);
        Assert.True(booking.ClientFlagged);
        Assert.Contains(d.Notifications.Alerts, a => a.Title == "Cliente con aviso");
    }

    // ── Llegada y aislamiento entre negocios ──────────────────────────

    [Fact]
    public async Task MarkArrived_ConfirmsTheBooking_OnlyForItsOwnBusiness()
    {
        var d = new TestData();
        var client = d.AddClient();
        var booking = d.AddBookingAtUtc(DateTime.UtcNow.AddMinutes(5), client);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            d.BookingService().MarkArrivedAsync(booking.Id, d.TenantB.Id, "Owner"));

        var result = await d.BookingService().MarkArrivedAsync(booking.Id, d.TenantA.Id, "Staff");
        Assert.Equal("Confirmed", result.Status);
        Assert.NotNull(result.ArrivedAt);
    }

    [Fact]
    public async Task Clients_AreListedOnlyForTheirOwnTenant()
    {
        var d = new TestData();
        var mine = d.AddClient("mio@a.com");
        var theirs = d.AddClient("suyo@b.com", d.TenantB.Id);

        var list = (await d.ClientService().GetClientsAsync(d.TenantA.Id)).ToList();

        Assert.Contains(list, c => c.Id == mine.Id);
        Assert.DoesNotContain(list, c => c.Id == theirs.Id);
        Assert.DoesNotContain(list, c => c.Id == d.OwnerA.Id); // el propietario no es un cliente
        await Assert.ThrowsAsync<InvalidOperationException>(() => d.ClientService().UnblockAsync(theirs.Id, d.TenantA.Id));
    }
}
