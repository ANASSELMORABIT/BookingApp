using BookingApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookingApp.Infrastructure.Persistence.Configurations;

public class ServiceExtraConfiguration : IEntityTypeConfiguration<ServiceExtra>
{
    public void Configure(EntityTypeBuilder<ServiceExtra> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Name).IsRequired().HasMaxLength(100);
        builder.Property(e => e.Price).HasPrecision(10, 2);

        builder.HasOne(e => e.Service)
               .WithMany(s => s.Extras)
               .HasForeignKey(e => e.ServiceId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
