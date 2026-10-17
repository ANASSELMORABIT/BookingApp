using BookingApp.Application.DTOs.Business;
using BookingApp.Application.DTOs.Services;

namespace BookingApp.Application.Interfaces;

public interface IBusinessService
{
    Task<IEnumerable<BusinessResponseDto>> GetByTenantAsync(Guid tenantId, string role = "Owner");
    Task<BusinessResponseDto> GetByIdAsync(Guid businessId, Guid tenantId, string role = "Owner");
    Task<BusinessResponseDto> CreateAsync(CreateBusinessDto dto, Guid tenantId);
    Task<BusinessResponseDto> UpdateAsync(Guid businessId, UpdateBusinessDto dto, Guid tenantId, string role = "Owner");
    Task DeleteAsync(Guid businessId, Guid tenantId, string role = "Owner");

    Task<IEnumerable<StaffResponseDto>> GetStaffAsync(Guid businessId, Guid tenantId, string role = "Owner");
    Task<StaffResponseDto> AddStaffAsync(Guid businessId, CreateStaffDto dto, Guid tenantId, string role = "Owner");
    Task ToggleStaffAsync(Guid staffId, Guid tenantId, string role = "Owner");

    Task<IEnumerable<ServiceResponseDto>> GetServicesAsync(Guid businessId, Guid tenantId, string role);
    Task<IEnumerable<PublicBusinessDto>> GetPublicBusinessesAsync(string slug);
    Task<ServiceResponseDto> CreateServiceAsync(Guid businessId, CreateServiceDto dto, Guid tenantId, string requesterRole);
    Task<ServiceResponseDto> UpdateServiceAsync(Guid serviceId, UpdateServiceDto dto, Guid tenantId, string requesterRole);
    Task DeleteServiceAsync(Guid serviceId, Guid tenantId, string requesterRole);
}