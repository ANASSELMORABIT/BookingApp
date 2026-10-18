using BookingApp.Application.DTOs.Clients;
using BookingApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookingApp.API.Controllers;

/// <summary>Clientes del negocio: historial, lista de avisos y bloqueos. Solo el propietario.</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "SameTenantOnly")]
[Authorize(Policy = "OwnerOnly")]
public class ClientsController : ControllerBase
{
    private readonly IClientService _clients;

    public ClientsController(IClientService clients)
    {
        _clients = clients;
    }

    // El tenant sale siempre del token, nunca de la petición
    private Guid TenantId => Guid.Parse(User.FindFirst("tenant_id")!.Value);

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _clients.GetClientsAsync(TenantId));

    [HttpPut("{id}/block")]
    public Task<IActionResult> Block(Guid id, BlockClientDto dto) => Run(() => _clients.BlockAsync(id, dto.Reason, TenantId));

    [HttpPut("{id}/unblock")]
    public Task<IActionResult> Unblock(Guid id) => Run(() => _clients.UnblockAsync(id, TenantId));

    [HttpPut("{id}/clear-flag")]
    public Task<IActionResult> ClearFlag(Guid id) => Run(() => _clients.ClearFlagAsync(id, TenantId));

    private async Task<IActionResult> Run(Func<Task<ClientSummaryDto>> action)
    {
        try
        {
            return Ok(await action());
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
