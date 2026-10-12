using BookingApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookingApp.Infrastructure.Persistence.Configurations;

public class BookingConfiguration : IEntityTypeConfiguration<Booking>
{
    public void Configure(EntityTypeBuilder<Booking> builder)
    {
        builder.HasKey(b => b.Id);
        builder.Property(b => b.Status).HasConversion<string>();
        builder.Property(b => b.PaymentStatus).HasConversion<string>();
        builder.Property(b => b.Notes).HasMaxLength(500);

        builder.HasOne(b => b.Service)
               .WithMany(s => s.Bookings)
               .HasForeignKey(b => b.ServiceId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(b => b.Staff)
               .WithMany(s => s.Bookings)
               .HasForeignKey(b => b.StaffId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(b => b.Client)
               .WithMany(u => u.Bookings)
               .HasForeignKey(b => b.ClientId)
               .OnDelete(DeleteBehavior.Restrict);

        // Índice para consultas de disponibilidad rápidas
        builder.HasIndex(b => new { b.StaffId, b.StartTime, b.EndTime });
    }
}