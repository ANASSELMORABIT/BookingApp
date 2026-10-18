using BookingApp.Application.DTOs.Clients;

namespace BookingApp.Application.Interfaces;

/// <summary>Clientes de un negocio: historial, lista de avisos y bloqueos.</summary>
public interface IClientService
{
    Task<IEnumerable<ClientSummaryDto>> GetClientsAsync(Guid tenantId);
    Task<ClientSummaryDto> BlockAsync(Guid clientId, string? reason, Guid tenantId);
    Task<ClientSummaryDto> UnblockAsync(Guid clientId, Guid tenantId);
    Task<ClientSummaryDto> ClearFlagAsync(Guid clientId, Guid tenantId);
}
