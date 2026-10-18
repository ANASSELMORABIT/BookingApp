namespace BookingApp.Application.DTOs.Services;

public class ServiceExtraDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int ExtraMinutes { get; set; }
    public bool IsActive { get; set; }
}

public class SaveServiceExtraDto
{
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int ExtraMinutes { get; set; }
    public bool IsActive { get; set; } = true;
}
