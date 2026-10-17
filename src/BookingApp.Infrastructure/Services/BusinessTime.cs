namespace BookingApp.Infrastructure.Services;

/// <summary>
/// Conversiones entre la hora local del negocio y UTC.
/// Las fechas se guardan siempre en UTC; el frontend trabaja con hora local.
/// </summary>
public static class BusinessTime
{
    public static readonly TimeZoneInfo Zone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Madrid");

    public static DateTime LocalToUtc(DateTime local) =>
        local.Kind == DateTimeKind.Utc
            ? local
            : TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(local, DateTimeKind.Unspecified), Zone);

    public static DateTime UtcToLocal(DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Zone);
}
