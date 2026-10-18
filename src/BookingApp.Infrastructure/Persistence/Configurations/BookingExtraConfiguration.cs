using BookingApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BookingApp.Infrastructure.Persistence.Configurations;

public class BookingExtraConfiguration : IEntityTypeConfiguration<BookingExtra>
{
    public void Configure(EntityTypeBuilder<BookingExtra> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Name).IsRequired().HasMaxLength(100);
        builder.Property(e => e.Price).HasPrecision(10, 2);

        // Si se borra el extra del catálogo, la reserva conserva su copia
        builder.HasOne<ServiceExtra>()
               .WithMany()
               .HasForeignKey(e => e.ServiceExtraId)
               .OnDelete(DeleteBehavior.SetNull);
    }
}
