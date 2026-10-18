using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookingApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceExtrasAndPolicies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "BlockedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BlockedReason",
                table: "Users",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsBlocked",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsFlagged",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "NoShowCount",
                table: "Users",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "AutoCancelLate",
                table: "Businesses",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "BlockLateCancellations",
                table: "Businesses",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "CancellationNoticeHours",
                table: "Businesses",
                type: "integer",
                nullable: false,
                defaultValue: 24);

            migrationBuilder.AddColumn<string>(
                name: "ExtraPolicy",
                table: "Businesses",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LateToleranceMinutes",
                table: "Businesses",
                type: "integer",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.AddColumn<bool>(
                name: "NoCompanionsPolicy",
                table: "Businesses",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ArrivedAt",
                table: "Bookings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CancelledAt",
                table: "Bookings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ClientFlagged",
                table: "Bookings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalPrice",
                table: "Bookings",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            // Las reservas anteriores pasan a tener como total el precio de su servicio
            migrationBuilder.Sql(
                "UPDATE \"Bookings\" AS b SET \"TotalPrice\" = s.\"Price\" " +
                "FROM \"Services\" AS s WHERE s.\"Id\" = b.\"ServiceId\";");

            migrationBuilder.CreateTable(
                name: "ServiceExtras",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Price = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    ExtraMinutes = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceExtras", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ServiceExtras_Services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BookingExtras",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceExtraId = table.Column<Guid>(type: "uuid", nullable: true),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Price = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    ExtraMinutes = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BookingExtras", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BookingExtras_Bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "Bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BookingExtras_ServiceExtras_ServiceExtraId",
                        column: x => x.ServiceExtraId,
                        principalTable: "ServiceExtras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BookingExtras_BookingId",
                table: "BookingExtras",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_BookingExtras_ServiceExtraId",
                table: "BookingExtras",
                column: "ServiceExtraId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceExtras_ServiceId",
                table: "ServiceExtras",
                column: "ServiceId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BookingExtras");

            migrationBuilder.DropTable(
                name: "ServiceExtras");

            migrationBuilder.DropColumn(
                name: "BlockedAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "BlockedReason",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IsBlocked",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IsFlagged",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "NoShowCount",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "AutoCancelLate",
                table: "Businesses");

            migrationBuilder.DropColumn(
                name: "BlockLateCancellations",
                table: "Businesses");

            migrationBuilder.DropColumn(
                name: "CancellationNoticeHours",
                table: "Businesses");

            migrationBuilder.DropColumn(
                name: "ExtraPolicy",
                table: "Businesses");

            migrationBuilder.DropColumn(
                name: "LateToleranceMinutes",
                table: "Businesses");

            migrationBuilder.DropColumn(
                name: "NoCompanionsPolicy",
                table: "Businesses");

            migrationBuilder.DropColumn(
                name: "ArrivedAt",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "CancelledAt",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "ClientFlagged",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "TotalPrice",
                table: "Bookings");
        }
    }
}
