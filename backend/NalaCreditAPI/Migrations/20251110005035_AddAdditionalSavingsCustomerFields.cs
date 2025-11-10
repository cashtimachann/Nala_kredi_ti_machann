using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalaCreditAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddAdditionalSavingsCustomerFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccountPurpose",
                table: "SavingsCustomers",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SpouseName",
                table: "SavingsCustomers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TransactionFrequency",
                table: "SavingsCustomers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccountPurpose",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "SpouseName",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "TransactionFrequency",
                table: "SavingsCustomers");
        }
    }
}
