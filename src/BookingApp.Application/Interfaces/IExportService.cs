namespace BookingApp.Application.Interfaces;

public interface IExportService
{
    Task<byte[]> ExportBookingsToExcelAsync(Guid tenantId, DateOnly from, DateOnly to, string role);
    Task<byte[]> ExportStatsToPdfAsync(Guid tenantId, DateOnly from, DateOnly to, string role);
}