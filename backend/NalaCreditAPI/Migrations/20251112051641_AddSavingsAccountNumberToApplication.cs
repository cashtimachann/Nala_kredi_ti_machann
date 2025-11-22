using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalaCreditAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddSavingsAccountNumberToApplication : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SavingsAccountNumber",
                table: "microcredit_loan_applications",
                type: "character varying(12)",
                maxLength: 12,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SavingsAccountNumber",
                table: "microcredit_loan_applications");
        }
    }
}
