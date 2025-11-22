using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalaCreditAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddDisbursementDateToApplication : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DisbursementDate",
                table: "microcredit_loan_applications",
                type: "timestamp without time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DisbursementDate",
                table: "microcredit_loan_applications");
        }
    }
}
