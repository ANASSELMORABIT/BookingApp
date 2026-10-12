using System.Security.Claims;
using BookingApp.Application.DTOs.Business;
using BookingApp.Application.DTOs.Services;
using BookingApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BookingApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "SameTenantOnly")]
public class BusinessController : ControllerBase
{
    private readonly IBusinessService _businessService;

    public BusinessController(IBusinessService businessService)
    {
        _businessService = businessService;
    }

    private Guid TenantId => Guid.Parse(User.FindFirstValue("tenant_id")!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    [Authorize(Policy = "AllRoles")]
    public async Task<IActionResult> GetAll()
    {
        var result = await _businessService.GetByTenantAsync(TenantId, Role);
        return Ok(result);
    }

    [HttpGet("{id}")]
    [Authorize(Policy = "AllRoles")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try
        {
            var result = await _businessService.GetByIdAsync(id, TenantId, Role);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost]
    [Authorize(Policy = "OwnerOnly")]
    public async Task<IActionResult> Create(CreateBusinessDto dto)
    {
        try
        {
            var result = await _businessService.CreateAsync(dto, TenantId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "OwnerOnly")]
    public async Task<IActionResult> Update(Guid id, UpdateBusinessDto dto)
    {
        try
        {
            var result = await _businessService.UpdateAsync(id, dto, TenantId, Role);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "OwnerOnly")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await _businessService.DeleteAsync(id, TenantId, Role);
            return Ok(new { message = "Negocio eliminado." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id}/staff")]
    [Authorize(Policy = "OwnerOrStaff")]
    public async Task<IActionResult> GetStaff(Guid id)
    {
        try
        {
            var result = await _businessService.GetStaffAsync(id, TenantId, Role);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/staff")]
    [Authorize(Policy = "OwnerOnly")]
    public async Task<IActionResult> AddStaff(Guid id, CreateStaffDto dto)
    {
        try
        {
            var result = await _businessService.AddStaffAsync(id, dto, TenantId, Role);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("staff/{staffId}/toggle")]
    [Authorize(Policy = "OwnerOnly")]
    public async Task<IActionResult> ToggleStaff(Guid staffId)
    {
        try
        {
            await _businessService.ToggleStaffAsync(staffId, TenantId, Role);
            return Ok(new { message = "Estado del staff actualizado." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id}/services")]
    [Authorize(Policy = "AllRoles")]
    public async Task<IActionResult> GetServices(Guid id)
    {
        var result = await _businessService.GetServicesAsync(id);
        return Ok(result);
    }

    [HttpPost("{id}/services")]
    [Authorize(Policy = "OwnerOrStaff")]
    public async Task<IActionResult> CreateService(Guid id, CreateServiceDto dto)
    {
        try
        {
            var result = await _businessService.CreateServiceAsync(id, dto, TenantId, Role);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPut("services/{serviceId}")]
    [Authorize(Policy = "OwnerOrStaff")]
    public async Task<IActionResult> UpdateService(Guid serviceId, UpdateServiceDto dto)
    {
        try
        {
            var result = await _businessService.UpdateServiceAsync(serviceId, dto, TenantId, Role);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpDelete("services/{serviceId}")]
    [Authorize(Policy = "OwnerOnly")]
    public async Task<IActionResult> DeleteService(Guid serviceId)
    {
        try
        {
            await _businessService.DeleteServiceAsync(serviceId, TenantId, Role);
            return Ok(new { message = "Servicio eliminado." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}