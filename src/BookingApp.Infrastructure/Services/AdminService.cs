using BookingApp.Application.DTOs.Admin;
using BookingApp.Application.Interfaces;
using BookingApp.Domain.Enums;
using BookingApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BookingApp.Infrastructure.Services;

public class AdminService : IAdminService
{
    private readonly AppDbContext _context;

    public AdminService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardStatsDto> GetDashboardStatsAsync(Guid tenantId, Guid? businessId = null, string role = "Owner")
    {
        var now = DateTime.UtcNow;
        var startOfDay   = now.Date;
        var startOfWeek  = now.Date.AddDays(-(int)now.DayOfWeek);
        var startOfMonth = new DateTime(now.Year, now.Month, 1);

        // SuperAdmin ve todos los tenants, Owner solo el suyo
        var query = _context.Bookings
            .Include(b => b.Service)
                .ThenInclude(s => s.Business)
            .Include(b => b.Staff)
            .AsQueryable();

        if (role != "SuperAdmin")
            query = query.Where(b => b.Service.Business.TenantId == tenantId);

        if (businessId.HasValue)
            query = query.Where(b => b.Service.BusinessId == businessId.Value);

        var bookings = await query.ToListAsync();
        var paid = bookings.Where(b => b.PaymentStatus == PaymentStatus.Paid).ToList();

        var staffStats = bookings
            .GroupBy(b => new { b.StaffId, b.Staff.Name })
            .Select(g => new StaffStatsDto
            {
                StaffId           = g.Key.StaffId,
                StaffName         = g.Key.Name,
                TotalBookings     = g.Count(),
                CompletedBookings = g.Count(b => b.Status == BookingStatus.Completed),
                CancelledBookings = g.Count(b => b.Status == BookingStatus.Cancelled),
                Revenue           = g.Where(b => b.PaymentStatus == PaymentStatus.Paid)
                                    .Sum(b => b.Service.Price)
            }).ToList();

        var topServices = bookings
            .GroupBy(b => new { b.ServiceId, b.Service.Name, b.Service.Price })
            .Select(g => new ServiceStatsDto
            {
                ServiceId     = g.Key.ServiceId,
                ServiceName   = g.Key.Name,
                TotalBookings = g.Count(),
                TotalRevenue  = g.Where(b => b.PaymentStatus == PaymentStatus.Paid)
                                .Sum(b => b.Service.Price),
                Price         = g.Key.Price
            })
            .OrderByDescending(s => s.TotalBookings)
            .Take(5)
            .ToList();

        var total     = bookings.Count;
        var cancelled = bookings.Count(b => b.Status == BookingStatus.Cancelled);

        return new DashboardStatsDto
        {
            TotalBookings     = total,
            BookingsToday     = bookings.Count(b => b.StartTime >= startOfDay),
            BookingsThisWeek  = bookings.Count(b => b.StartTime >= startOfWeek),
            BookingsThisMonth = bookings.Count(b => b.StartTime >= startOfMonth),
            RevenueTotal      = paid.Sum(b => b.Service.Price),
            RevenueThisMonth  = paid.Where(b => b.StartTime >= startOfMonth).Sum(b => b.Service.Price),
            CancelledBookings = cancelled,
            CancellationRate  = total > 0 ? Math.Round((double)cancelled / total * 100, 1) : 0,
            StaffStats        = staffStats,
            TopServices       = topServices
        };
    }

    public async Task<IEnumerable<BookingsByPeriodDto>> GetBookingsByPeriodAsync(
        Guid tenantId, DateOnly from, DateOnly to)
    {
        var fromDt = from.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var toDt   = to.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        var bookings = await _context.Bookings
            .Include(b => b.Service)
                .ThenInclude(s => s.Business)
            .Where(b => b.Service.Business.TenantId == tenantId
                     && b.StartTime >= fromDt
                     && b.StartTime <= toDt)
            .ToListAsync();

        return bookings
            .GroupBy(b => DateOnly.FromDateTime(b.StartTime))
            .Select(g => new BookingsByPeriodDto
            {
                Date          = g.Key,
                TotalBookings = g.Count(),
                Confirmed     = g.Count(b => b.Status == BookingStatus.Confirmed),
                Cancelled     = g.Count(b => b.Status == BookingStatus.Cancelled),
                Revenue       = g.Where(b => b.PaymentStatus == PaymentStatus.Paid)
                                 .Sum(b => b.Service.Price)
            })
            .OrderBy(b => b.Date);
    }

    public async Task<IEnumerable<StaffStatsDto>> GetStaffStatsAsync(Guid businessId, Guid tenantId)
    {
        var business = await _context.Businesses
            .FirstOrDefaultAsync(b => b.Id == businessId && b.TenantId == tenantId)
            ?? throw new InvalidOperationException("Negocio no encontrado.");

        var bookings = await _context.Bookings
            .Include(b => b.Service)
            .Include(b => b.Staff)
            .Where(b => b.Service.BusinessId == businessId)
            .ToListAsync();

        return bookings
            .GroupBy(b => new { b.StaffId, b.Staff.Name })
            .Select(g => new StaffStatsDto
            {
                StaffId           = g.Key.StaffId,
                StaffName         = g.Key.Name,
                TotalBookings     = g.Count(),
                CompletedBookings = g.Count(b => b.Status == BookingStatus.Completed),
                CancelledBookings = g.Count(b => b.Status == BookingStatus.Cancelled),
                Revenue           = g.Where(b => b.PaymentStatus == PaymentStatus.Paid)
                                     .Sum(b => b.Service.Price)
            });
    }
}