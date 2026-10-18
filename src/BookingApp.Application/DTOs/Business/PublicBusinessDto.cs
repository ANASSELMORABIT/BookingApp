namespace BookingApp.Application.DTOs.Business;

/// <summary>Datos de un negocio visibles en la página pública de reservas.</summary>
public class PublicBusinessDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string OpenTime { get; set; } = string.Empty;
    public string CloseTime { get; set; } = string.Empty;
    public List<PublicServiceDto> Services { get; set; } = new();
    public List<PublicStaffDto> Staff { get; set; } = new();
    public BusinessPoliciesDto Policies { get; set; } = new();
}

public class PublicServiceDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }
    public List<PublicExtraDto> Extras { get; set; } = new();
}

public class PublicExtraDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int ExtraMinutes { get; set; }
}

public class PublicStaffDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}
