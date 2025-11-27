using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalaCreditAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddApprovedAmountToApplication : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ApprovedAmount",
                table: "microcredit_loan_applications",
                type: "numeric(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApprovedAmount",
                table: "microcredit_loan_applications");
        }
    }
}
