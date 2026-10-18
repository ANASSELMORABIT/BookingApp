using BookingApp.Application.DTOs.Clients;
using BookingApp.Application.Interfaces;
using BookingApp.Domain.Entities;
using BookingApp.Domain.Enums;
using BookingApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BookingApp.Infrastructure.Services;

/// <summary>Clientes del negocio (siempre filtrados por el tenant de quien pregunta).</summary>
public class ClientService : IClientService
{
    private readonly AppDbContext _context;

    public ClientService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<ClientSummaryDto>> GetClientsAsync(Guid tenantId)
    {
        var rows = await _context.Users
            .Where(u => u.TenantId == tenantId && u.Role == "Client")
            .Select(u => new
            {
                User = u,
                Total = u.Bookings.Count(),
                Cancelled = u.Bookings.Count(b => b.Status == BookingStatus.Cancelled),
                Last = u.Bookings.Max(b => (DateTime?)b.StartTime),
            })
            .ToListAsync();

        // Primero los bloqueados y los de la lista de avisos; después, por nombre
        return rows
            .OrderByDescending(r => r.User.IsBlocked)
            .ThenByDescending(r => r.User.IsFlagged)
            .ThenBy(r => r.User.FullName)
            .Select(r => Map(r.User, r.Total, r.Cancelled, r.Last));
    }

    public async Task<ClientSummaryDto> BlockAsync(Guid clientId, string? reason, Guid tenantId)
    {
        var user = await FindAsync(clientId, tenantId);
        user.Block(string.IsNullOrWhiteSpace(reason) ? "Bloqueado por el negocio." : reason.Trim(), DateTime.UtcNow);
        await _context.SaveChangesAsync();
        return await GetOneAsync(user.Id, tenantId);
    }

    public async Task<ClientSummaryDto> UnblockAsync(Guid clientId, Guid tenantId)
    {
        var user = await FindAsync(clientId, tenantId);
        user.Unblock();
        await _context.SaveChangesAsync();
        return await GetOneAsync(user.Id, tenantId);
    }

    public async Task<ClientSummaryDto> ClearFlagAsync(Guid clientId, Guid tenantId)
    {
        var user = await FindAsync(clientId, tenantId);
        user.ClearFlag();
        await _context.SaveChangesAsync();
        return await GetOneAsync(user.Id, tenantId);
    }

    private async Task<AppUser> FindAsync(Guid clientId, Guid tenantId) =>
        await _context.Users.FirstOrDefaultAsync(u => u.Id == clientId && u.TenantId == tenantId && u.Role == "Client")
        ?? throw new InvalidOperationException("Cliente no encontrado.");

    private async Task<ClientSummaryDto> GetOneAsync(Guid clientId, Guid tenantId) =>
        (await GetClientsAsync(tenantId)).First(c => c.Id == clientId);

    private static ClientSummaryDto Map(AppUser u, int total, int cancelled, DateTime? last) => new()
    {
        Id             = u.Id,
        FullName       = u.FullName,
        Email          = u.Email,
        Phone          = u.Phone,
        TotalBookings  = total,
        NoShowCount    = u.NoShowCount,
        CancelledCount = cancelled,
        IsFlagged      = u.IsFlagged,
        IsBlocked      = u.IsBlocked,
        BlockedReason  = u.BlockedReason,
        BlockedAt      = u.BlockedAt is null ? null : DateTime.SpecifyKind(u.BlockedAt.Value, DateTimeKind.Utc),
        LastBookingAt  = last is null ? null : DateTime.SpecifyKind(last.Value, DateTimeKind.Utc),
    };
}
