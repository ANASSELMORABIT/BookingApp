using BookingApp.Application.Interfaces;
using BookingApp.Domain.Enums;
using BookingApp.Infrastructure.Persistence;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace BookingApp.Infrastructure.Services;

public class ExportService : IExportService
{
    private readonly AppDbContext _context;

    public ExportService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<byte[]> ExportBookingsToExcelAsync(Guid tenantId, DateOnly from, DateOnly to, string role)
    {
        var fromDt = from.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var toDt   = to.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        var query = _context.Bookings
            .Include(b => b.Service).ThenInclude(s => s.Business)
            .Include(b => b.Staff)
            .Include(b => b.Client)
            .Where(b => b.StartTime >= fromDt && b.StartTime <= toDt)
            .AsQueryable();

        if (role != "SuperAdmin")
            query = query.Where(b => b.Service.Business.TenantId == tenantId);

        var bookings = await query.OrderBy(b => b.StartTime).ToListAsync();

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Reservas");

        // Estilo del header
        var headerRow = ws.Row(1);
        headerRow.Style.Font.Bold = true;
        headerRow.Style.Fill.BackgroundColor = XLColor.FromHtml("#7C3AED");
        headerRow.Style.Font.FontColor = XLColor.White;

        // Cabeceras
        var headers = new[] { "ID", "Cliente", "Email", "Servicio", "Staff", "Negocio", "Fecha", "Hora inicio", "Hora fin", "Estado", "Pago", "Precio" };
        for (int i = 0; i < headers.Length; i++)
            ws.Cell(1, i + 1).Value = headers[i];

        // Datos
        for (int i = 0; i < bookings.Count; i++)
        {
            var b = bookings[i];
            var row = i + 2;
            var timeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Madrid");

            ws.Cell(row, 1).Value  = b.Id.ToString()[..8];
            ws.Cell(row, 2).Value  = b.Client.FullName;
            ws.Cell(row, 3).Value  = b.Client.Email;
            ws.Cell(row, 4).Value  = b.Service.Name;
            ws.Cell(row, 5).Value  = b.Staff.Name;
            ws.Cell(row, 6).Value  = b.Service.Business.Name;
            ws.Cell(row, 7).Value  = TimeZoneInfo.ConvertTimeFromUtc(b.StartTime, timeZone).ToString("dd/MM/yyyy");
            ws.Cell(row, 8).Value  = TimeZoneInfo.ConvertTimeFromUtc(b.StartTime, timeZone).ToString("HH:mm");
            ws.Cell(row, 9).Value  = TimeZoneInfo.ConvertTimeFromUtc(b.EndTime, timeZone).ToString("HH:mm");
            ws.Cell(row, 10).Value = b.Status.ToString();
            ws.Cell(row, 11).Value = b.PaymentStatus.ToString();
            ws.Cell(row, 12).Value = b.Service.Price;

            // Color por estado
            var color = b.Status switch
            {
                BookingStatus.Confirmed  => XLColor.FromHtml("#D1FAE5"),
                BookingStatus.Cancelled  => XLColor.FromHtml("#FEE2E2"),
                BookingStatus.Completed  => XLColor.FromHtml("#DBEAFE"),
                _                        => XLColor.FromHtml("#EDE9FE"),
            };
            ws.Row(row).Style.Fill.BackgroundColor = color;
        }

        // Autofit columnas
        ws.Columns().AdjustToContents();

        // Fila de totales
        var totalRow = bookings.Count + 2;
        ws.Cell(totalRow, 1).Value = "TOTAL";
        ws.Cell(totalRow, 1).Style.Font.Bold = true;
        ws.Cell(totalRow, 12).Value = bookings.Sum(b => b.Service.Price);
        ws.Cell(totalRow, 12).Style.Font.Bold = true;

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public async Task<byte[]> ExportStatsToPdfAsync(Guid tenantId, DateOnly from, DateOnly to, string role)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var fromDt = from.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var toDt   = to.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        var query = _context.Bookings
            .Include(b => b.Service).ThenInclude(s => s.Business)
            .Include(b => b.Staff)
            .Include(b => b.Client)
            .Where(b => b.StartTime >= fromDt && b.StartTime <= toDt)
            .AsQueryable();

        if (role != "SuperAdmin")
            query = query.Where(b => b.Service.Business.TenantId == tenantId);

        var bookings = await query.ToListAsync();

        var totalBookings  = bookings.Count;
        var totalRevenue   = bookings.Where(b => b.PaymentStatus == PaymentStatus.Paid).Sum(b => b.Service.Price);
        var cancelled      = bookings.Count(b => b.Status == BookingStatus.Cancelled);
        var cancellationRate = totalBookings > 0 ? Math.Round((double)cancelled / totalBookings * 100, 1) : 0;

        var topServices = bookings
            .GroupBy(b => b.Service.Name)
            .Select(g => new { Name = g.Key, Count = g.Count(), Revenue = g.Where(b => b.PaymentStatus == PaymentStatus.Paid).Sum(b => b.Service.Price) })
            .OrderByDescending(s => s.Count)
            .Take(5)
            .ToList();

        var staffStats = bookings
            .GroupBy(b => b.Staff.Name)
            .Select(g => new { Name = g.Key, Count = g.Count(), Completed = g.Count(b => b.Status == BookingStatus.Completed) })
            .OrderByDescending(s => s.Count)
            .ToList();

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("BookingApp").FontSize(24).Bold().FontColor("#7C3AED");
                            c.Item().Text("Informe de estadísticas").FontSize(14).FontColor("#64748B");
                        });
                        row.ConstantItem(150).AlignRight().Column(c =>
                        {
                            c.Item().Text($"Período: {from:dd/MM/yyyy} - {to:dd/MM/yyyy}").FontSize(9).FontColor("#94A3B8");
                            c.Item().Text($"Generado: {DateTime.Now:dd/MM/yyyy HH:mm}").FontSize(9).FontColor("#94A3B8");
                        });
                    });
                    col.Item().PaddingTop(8).LineHorizontal(1).LineColor("#E2E8F0");
                });

                page.Content().PaddingTop(20).Column(col =>
                {
                    // KPIs
                    col.Item().Text("Resumen general").FontSize(14).Bold().FontColor("#1E293B");
                    col.Item().PaddingTop(10).Row(row =>
                    {
                        void KpiBox(string label, string value, string color)
                        {
                           row.RelativeItem()
                                    .Padding(4)
                                    .Border(1)
                                    .BorderColor("#E2E8F0")
                                    .Padding(12)
                                    .Column(c =>
                                    {
                                        c.Item().Text(value)
                                            .FontSize(22)
                                            .Bold()
                                            .FontColor(color);

                                        c.Item().Text(label)
                                            .FontSize(9)
                                            .FontColor("#64748B");
                                    });
                        }
                        KpiBox("Total reservas",   totalBookings.ToString(),          "#7C3AED");
                        KpiBox("Ingresos totales",  $"{totalRevenue:F2}€",            "#10B981");
                        KpiBox("Cancelaciones",     $"{cancelled} ({cancellationRate}%)", "#EF4444");
                    });

                    col.Item().PaddingTop(20).Text("Servicios más populares").FontSize(14).Bold().FontColor("#1E293B");
                    col.Item().PaddingTop(10).Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.RelativeColumn(3);
                            c.RelativeColumn(1);
                            c.RelativeColumn(2);
                        });

                        table.Header(h =>
                        {
                            h.Cell().Background("#7C3AED").Padding(8).Text("Servicio").FontColor(Colors.White).Bold();
                            h.Cell().Background("#7C3AED").Padding(8).Text("Reservas").FontColor(Colors.White).Bold();
                            h.Cell().Background("#7C3AED").Padding(8).Text("Ingresos").FontColor(Colors.White).Bold();
                        });

                        foreach (var (s, idx) in topServices.Select((s, i) => (s, i)))
                        {
                            var bg = idx % 2 == 0 ? "#F8FAFC" : "#FFFFFF";
                            table.Cell().Background(bg).Padding(8).Text(s.Name);
                            table.Cell().Background(bg).Padding(8).Text(s.Count.ToString());
                            table.Cell().Background(bg).Padding(8).Text($"{s.Revenue:F2}€");
                        }
                    });

                    col.Item().PaddingTop(20).Text("Rendimiento del staff").FontSize(14).Bold().FontColor("#1E293B");
                    col.Item().PaddingTop(10).Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.RelativeColumn(3);
                            c.RelativeColumn(1);
                            c.RelativeColumn(1);
                        });

                        table.Header(h =>
                        {
                            h.Cell().Background("#7C3AED").Padding(8).Text("Staff").FontColor(Colors.White).Bold();
                            h.Cell().Background("#7C3AED").Padding(8).Text("Reservas").FontColor(Colors.White).Bold();
                            h.Cell().Background("#7C3AED").Padding(8).Text("Completadas").FontColor(Colors.White).Bold();
                        });

                        foreach (var (s, idx) in staffStats.Select((s, i) => (s, i)))
                        {
                            var bg = idx % 2 == 0 ? "#F8FAFC" : "#FFFFFF";
                            table.Cell().Background(bg).Padding(8).Text(s.Name);
                            table.Cell().Background(bg).Padding(8).Text(s.Count.ToString());
                            table.Cell().Background(bg).Padding(8).Text(s.Completed.ToString());
                        }
                    });
                });

                page.Footer().AlignCenter().Text(x =>
                {
                    x.Span("BookingApp — ").FontColor("#94A3B8");
                    x.Span("Página ").FontColor("#94A3B8");
                    x.CurrentPageNumber().FontColor("#94A3B8");
                    x.Span(" de ").FontColor("#94A3B8");
                    x.TotalPages().FontColor("#94A3B8");
                });
            });
        });

        return document.GeneratePdf();
    }
}