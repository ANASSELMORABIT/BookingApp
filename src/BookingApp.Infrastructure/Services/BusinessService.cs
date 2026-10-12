using BookingApp.Application.DTOs.Business;
using BookingApp.Application.DTOs.Services;
using BookingApp.Application.Interfaces;
using BookingApp.Domain.Entities;
using BookingApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BookingApp.Infrastructure.Services;

public class BusinessService : IBusinessService
{
    private readonly AppDbContext _context;

    public BusinessService(AppDbContext context)
    {
        _context = context;
    }

    private IQueryable<Business> BusinessQuery(Guid tenantId, string role) =>
        role == "SuperAdmin"
            ? _context.Businesses.Include(b => b.Services).Include(b => b.Staff)
            : _context.Businesses.Include(b => b.Services).Include(b => b.Staff)
                .Where(b => b.TenantId == tenantId);

    public async Task<IEnumerable<BusinessResponseDto>> GetByTenantAsync(Guid tenantId, string role = "Owner")
    {
        var businesses = await BusinessQuery(tenantId, role).ToListAsync();
        return businesses.Select(MapToDto);
    }

    public async Task<BusinessResponseDto> GetByIdAsync(Guid businessId, Guid tenantId, string role = "Owner")
    {
        var business = await BusinessQuery(tenantId, role)
            .FirstOrDefaultAsync(b => b.Id == businessId)
            ?? throw new InvalidOperationException("Negocio no encontrado.");
        return MapToDto(business);
    }

    public async Task<BusinessResponseDto> CreateAsync(CreateBusinessDto dto, Guid tenantId)
    {
        var business = Business.Create(tenantId, dto.Name, dto.Category, dto.OpenTime, dto.CloseTime);
        business.Update(dto.Name, dto.Phone, dto.Address, dto.OpenTime, dto.CloseTime);
        _context.Businesses.Add(business);
        await _context.SaveChangesAsync();
        return await GetByIdAsync(business.Id, tenantId, "SuperAdmin");
    }

    public async Task<BusinessResponseDto> UpdateAsync(Guid businessId, UpdateBusinessDto dto, Guid tenantId, string role = "Owner")
    {
        var business = await BusinessQuery(tenantId, role)
            .FirstOrDefaultAsync(b => b.Id == businessId)
            ?? throw new InvalidOperationException("Negocio no encontrado.");
        business.Update(dto.Name, dto.Phone, dto.Address, dto.OpenTime, dto.CloseTime);
        await _context.SaveChangesAsync();
        return await GetByIdAsync(businessId, tenantId, role);
    }

    public async Task DeleteAsync(Guid businessId, Guid tenantId, string role = "Owner")
    {
        var business = await BusinessQuery(tenantId, role)
            .FirstOrDefaultAsync(b => b.Id == businessId)
            ?? throw new InvalidOperationException("Negocio no encontrado.");
        _context.Businesses.Remove(business);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<StaffResponseDto>> GetStaffAsync(Guid businessId, Guid tenantId, string role = "Owner")
    {
        // Verificar que el negocio existe y es accesible
        var businessExists = await BusinessQuery(tenantId, role)
            .AnyAsync(b => b.Id == businessId);
        if (!businessExists)
            throw new InvalidOperationException("Negocio no encontrado.");

        var staff = await _context.Staff
            .Include(s => s.Bookings)
            .Where(s => s.BusinessId == businessId)
            .ToListAsync();

        return staff.Select(s => new StaffResponseDto
        {
            Id            = s.Id,
            Name          = s.Name,
            Email         = s.Email,
            IsActive      = s.IsActive,
            TotalBookings = s.Bookings.Count
        });
    }

    public async Task<StaffResponseDto> AddStaffAsync(Guid businessId, CreateStaffDto dto, Guid tenantId, string role = "Owner")
    {
        var businessExists = await BusinessQuery(tenantId, role)
            .AnyAsync(b => b.Id == businessId);
        if (!businessExists)
            throw new InvalidOperationException("Negocio no encontrado.");

        var staff = Staff.Create(businessId, dto.Name, dto.Email);
        _context.Staff.Add(staff);
        await _context.SaveChangesAsync();

        return new StaffResponseDto
        {
            Id            = staff.Id,
            Name          = staff.Name,
            Email         = staff.Email,
            IsActive      = staff.IsActive,
            TotalBookings = 0
        };
    }

    public async Task ToggleStaffAsync(Guid staffId, Guid tenantId, string role = "Owner")
    {
        var staff = role == "SuperAdmin"
            ? await _context.Staff.Include(s => s.Business)
                .FirstOrDefaultAsync(s => s.Id == staffId)
            : await _context.Staff.Include(s => s.Business)
                .FirstOrDefaultAsync(s => s.Id == staffId && s.Business.TenantId == tenantId);

        if (staff is null)
            throw new InvalidOperationException("Staff no encontrado.");

        staff.Toggle();
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<ServiceResponseDto>> GetServicesAsync(Guid businessId)
    {
        var services = await _context.Services
            .Where(s => s.BusinessId == businessId)
            .ToListAsync();
        return services.Select(MapServiceToDto);
    }

    public async Task<ServiceResponseDto> CreateServiceAsync(Guid businessId, CreateServiceDto dto,
        Guid tenantId, string requesterRole)
    {
        var businessExists = await BusinessQuery(tenantId, requesterRole)
            .AnyAsync(b => b.Id == businessId);
        if (!businessExists)
            throw new InvalidOperationException("Negocio no encontrado.");

        if (requesterRole != "Owner" && requesterRole != "Staff" && requesterRole != "SuperAdmin")
            throw new UnauthorizedAccessException("Sin permisos para crear servicios.");

        var service = Service.Create(businessId, dto.Name, dto.DurationMinutes, dto.Price);
        _context.Services.Add(service);
        await _context.SaveChangesAsync();
        return MapServiceToDto(service);
    }

    public async Task<ServiceResponseDto> UpdateServiceAsync(Guid serviceId, UpdateServiceDto dto,
        Guid tenantId, string requesterRole)
    {
        var service = requesterRole == "SuperAdmin"
            ? await _context.Services.Include(s => s.Business)
                .FirstOrDefaultAsync(s => s.Id == serviceId)
            : await _context.Services.Include(s => s.Business)
                .FirstOrDefaultAsync(s => s.Id == serviceId && s.Business.TenantId == tenantId);

        if (service is null)
            throw new InvalidOperationException("Servicio no encontrado.");

        if (requesterRole != "Owner" && requesterRole != "Staff" && requesterRole != "SuperAdmin")
            throw new UnauthorizedAccessException("Sin permisos para editar servicios.");

        service.Update(dto.Name, dto.Description, dto.DurationMinutes, dto.Price, dto.IsActive);
        await _context.SaveChangesAsync();
        return MapServiceToDto(service);
    }

    public async Task DeleteServiceAsync(Guid serviceId, Guid tenantId, string requesterRole)
    {
        if (requesterRole != "Owner" && requesterRole != "SuperAdmin")
            throw new UnauthorizedAccessException("Solo un Owner puede eliminar servicios.");

        var service = requesterRole == "SuperAdmin"
            ? await _context.Services.Include(s => s.Business)
                .FirstOrDefaultAsync(s => s.Id == serviceId)
            : await _context.Services.Include(s => s.Business)
                .FirstOrDefaultAsync(s => s.Id == serviceId && s.Business.TenantId == tenantId);

        if (service is null)
            throw new InvalidOperationException("Servicio no encontrado.");

        _context.Services.Remove(service);
        await _context.SaveChangesAsync();
    }

    private static BusinessResponseDto MapToDto(Business b) => new()
    {
        Id            = b.Id,
        Name          = b.Name,
        Category      = b.Category,
        Phone         = b.Phone,
        Address       = b.Address,
        OpenTime      = b.OpenTime.ToString("HH:mm"),
        CloseTime     = b.CloseTime.ToString("HH:mm"),
        TotalServices = b.Services.Count,
        TotalStaff    = b.Staff.Count
    };

    private static ServiceResponseDto MapServiceToDto(Domain.Entities.Service s) => new()
    {
        Id              = s.Id,
        Name            = s.Name,
        Description     = s.Description,
        DurationMinutes = s.DurationMinutes,
        Price           = s.Price,
        IsActive        = s.IsActive
    };
}