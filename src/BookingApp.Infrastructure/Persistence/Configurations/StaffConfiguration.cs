using BookingApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookingApp.Infrastructure.Persistence.Configurations;

public class StaffConfiguration : IEntityTypeConfiguration<Staff>
{
    public void Configure(EntityTypeBuilder<Staff> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Name).IsRequired().HasMaxLength(100);
        builder.Property(s => s.Email).HasMaxLength(150);

        builder.HasOne(s => s.Business)
               .WithMany(b => b.Staff)
               .HasForeignKey(s => s.BusinessId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}