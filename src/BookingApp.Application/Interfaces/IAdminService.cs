using BookingApp.Application.DTOs.Admin;

namespace BookingApp.Application.Interfaces;

public interface IAdminService
{
    Task<DashboardStatsDto> GetDashboardStatsAsync(Guid tenantId, Guid? businessId = null, string role = "Owner");
    Task<IEnumerable<BookingsByPeriodDto>> GetBookingsByPeriodAsync(Guid tenantId, DateOnly from, DateOnly to);
    Task<IEnumerable<StaffStatsDto>> GetStaffStatsAsync(Guid businessId, Guid tenantId);
}