using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NalaCreditAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddBranchFundAdditionsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BranchId",
                table: "CurrencyExchangeRates",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BranchFundAdditions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    BranchId = table.Column<int>(type: "integer", nullable: false),
                    AddedBy = table.Column<string>(type: "text", nullable: false),
                    AddedByUserId = table.Column<string>(type: "text", nullable: true),
                    AmountHTG = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    AmountUSD = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsAllocated = table.Column<bool>(type: "boolean", nullable: false),
                    AllocatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BranchFundAdditions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BranchFundAdditions_AspNetUsers_AddedByUserId",
                        column: x => x.AddedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BranchFundAdditions_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BranchFundAdditions_AddedByUserId",
                table: "BranchFundAdditions",
                column: "AddedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BranchFundAdditions_BranchId",
                table: "BranchFundAdditions",
                column: "BranchId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BranchFundAdditions");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "CurrencyExchangeRates");
        }
    }
}
