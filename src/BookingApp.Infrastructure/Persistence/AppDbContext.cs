using BookingApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookingApp.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Business> Businesses => Set<Business>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<Staff> Staff => Set<Staff>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<ServiceExtra> ServiceExtras => Set<ServiceExtra>();
    public DbSet<BookingExtra> BookingExtras => Set<BookingExtra>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}