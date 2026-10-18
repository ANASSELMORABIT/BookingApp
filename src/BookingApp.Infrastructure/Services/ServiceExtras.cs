using BookingApp.Domain.Entities;
using BookingApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BookingApp.Infrastructure.Services;

/// <summary>Carga y valida los extras elegidos para un servicio (común a disponibilidad y reservas).</summary>
internal static class ServiceExtras
{
    public const int MaxPerBooking = 10;

    public static async Task<List<ServiceExtra>> LoadAsync(AppDbContext context, Guid serviceId, IEnumerable<Guid>? extraIds)
    {
        var wanted = (extraIds ?? Enumerable.Empty<Guid>()).Distinct().ToList();
        if (wanted.Count == 0)
            return new List<ServiceExtra>();
        if (wanted.Count > MaxPerBooking)
            throw new InvalidOperationException($"Puedes elegir como máximo {MaxPerBooking} extras.");

        var extras = await context.ServiceExtras
            .Where(e => e.ServiceId == serviceId && e.IsActive && wanted.Contains(e.Id))
            .ToListAsync();

        // Un extra de otro servicio, inactivo o inexistente invalida la petición
        if (extras.Count != wanted.Count)
            throw new InvalidOperationException("Alguno de los extras elegidos no está disponible para este servicio.");

        return extras;
    }

    public static int TotalMinutes(Service service, IEnumerable<ServiceExtra> extras) =>
        service.DurationMinutes + extras.Sum(e => e.ExtraMinutes);
}
