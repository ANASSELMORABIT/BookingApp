using BookingApp.Application.Interfaces;
using BookingApp.Domain.Entities;
using BookingApp.Infrastructure.Persistence;
using BookingApp.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace BookingApp.Tests;

/// <summary>Base de datos en memoria con dos tenants, cada uno con un negocio, servicio y empleado.</summary>
public sealed class TestData
{
    public AppDbContext Db { get; }
    public Tenant TenantA { get; }
    public Tenant TenantB { get; }
    public Business BusinessA { get; }
    public Business BusinessB { get; }
    public Service ServiceA { get; }   // 30 min, negocio A
    public Service ServiceB { get; }
    public Staff StaffA { get; }
    public Staff StaffB { get; }
    public AppUser OwnerA { get; }
    public FakeNotifications Notifications { get; } = new();
    public FakeEmail Email { get; } = new();

    /// <summary>Un día laborable dentro de 30 días, siempre en el futuro.</summary>
    public DateOnly Day { get; } = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30));

    public TestData()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        Db = new AppDbContext(options);

        TenantA = Tenant.Create("A", "negocio-a");
        TenantB = Tenant.Create("B", "negocio-b");
        BusinessA = Business.Create(TenantA.Id, "Peluquería A", "peluqueria", new TimeOnly(9, 0), new TimeOnly(12, 0));
        BusinessB = Business.Create(TenantB.Id, "Gimnasio B", "gimnasio", new TimeOnly(9, 0), new TimeOnly(12, 0));
        ServiceA = Service.Create(BusinessA.Id, "Corte", 30, 15m);
        ServiceB = Service.Create(BusinessB.Id, "Clase", 60, 10m);
        StaffA = Staff.Create(BusinessA.Id, "Ana");
        StaffB = Staff.Create(BusinessB.Id, "Bruno");
        OwnerA = AppUser.Create(TenantA.Id, "owner@a.com", "Owner A", "Owner");

        Db.AddRange(TenantA, TenantB, BusinessA, BusinessB, ServiceA, ServiceB, StaffA, StaffB, OwnerA);
        Db.SaveChanges();
    }

    public BookingService BookingService() =>
        new(Db, Notifications, Email, NullLogger<BookingService>.Instance);

    public AvailabilityService AvailabilityService() => new(Db);

    /// <summary>Hora local del negocio en <see cref="Day"/>.</summary>
    public DateTime Local(int hour, int minute = 0) => Day.ToDateTime(new TimeOnly(hour, minute));
}

public sealed class FakeNotifications : INotificationService
{
    public List<string> Sent { get; } = new();

    public Task SendBookingCreatedAsync(Guid tenantId, string clientName, string serviceName, DateTime startTime)
    { Sent.Add($"created:{tenantId}"); return Task.CompletedTask; }

    public Task SendBookingCancelledAsync(Guid tenantId, string clientName, string serviceName, DateTime startTime)
    { Sent.Add($"cancelled:{tenantId}"); return Task.CompletedTask; }

    public Task SendBookingConfirmedAsync(Guid tenantId, string clientName, string serviceName, DateTime startTime)
    { Sent.Add($"confirmed:{tenantId}"); return Task.CompletedTask; }
}

public sealed class FakeEmail : IEmailService
{
    public List<string> Sent { get; } = new();

    public Task SendBookingConfirmationAsync(string toEmail, string clientName, string serviceName, DateTime startTime)
    { Sent.Add(toEmail); return Task.CompletedTask; }

    public Task SendBookingReminderAsync(string toEmail, string clientName, string serviceName, DateTime startTime)
        => Task.CompletedTask;

    public Task SendBookingCancellationAsync(string toEmail, string clientName, string serviceName, DateTime startTime)
        => Task.CompletedTask;
}
