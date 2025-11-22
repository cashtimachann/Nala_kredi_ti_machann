using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalaCreditAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddLoanApplicationSnapshotFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CustomerAddressJson",
                table: "microcredit_loan_applications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomerEmail",
                table: "microcredit_loan_applications",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomerName",
                table: "microcredit_loan_applications",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomerPhone",
                table: "microcredit_loan_applications",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Occupation",
                table: "microcredit_loan_applications",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomerAddressJson",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "CustomerEmail",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "CustomerName",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "CustomerPhone",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "Occupation",
                table: "microcredit_loan_applications");
        }
    }
}
