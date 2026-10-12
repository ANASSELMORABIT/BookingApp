namespace BookingApp.API.Authorization;

public static class Policies
{
    public const string OwnerOnly        = "OwnerOnly";
    public const string OwnerOrStaff     = "OwnerOrStaff";
    public const string AllRoles         = "AllRoles";
    public const string SameTenantOnly   = "SameTenantOnly";
}