namespace BookingApp.Application.DTOs.Services;

public class ServiceResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }
    public bool IsActive { get; set; }
    public List<ServiceExtraDto> Extras { get; set; } = new();
}