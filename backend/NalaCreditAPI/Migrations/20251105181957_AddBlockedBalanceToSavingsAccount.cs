using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalaCreditAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddBlockedBalanceToSavingsAccount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "BlockedBalance",
                table: "SavingsAccounts",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "BlockedGuaranteeAmount",
                table: "microcredit_loan_applications",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BlockedSavingsAccountId",
                table: "microcredit_loan_applications",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BlockedBalance",
                table: "SavingsAccounts");

            migrationBuilder.DropColumn(
                name: "BlockedGuaranteeAmount",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "BlockedSavingsAccountId",
                table: "microcredit_loan_applications");
        }
    }
}
