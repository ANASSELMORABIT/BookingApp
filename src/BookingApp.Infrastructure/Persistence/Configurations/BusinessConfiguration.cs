using BookingApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookingApp.Infrastructure.Persistence.Configurations;

public class BusinessConfiguration : IEntityTypeConfiguration<Business>
{
    public void Configure(EntityTypeBuilder<Business> builder)
    {
        builder.HasKey(b => b.Id);
        builder.Property(b => b.Name).IsRequired().HasMaxLength(100);
        builder.Property(b => b.Category).IsRequired().HasMaxLength(50);
        builder.Property(b => b.ExtraPolicy).HasMaxLength(500);

        builder.HasOne(b => b.Tenant)
               .WithMany(t => t.Businesses)
               .HasForeignKey(b => b.TenantId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}