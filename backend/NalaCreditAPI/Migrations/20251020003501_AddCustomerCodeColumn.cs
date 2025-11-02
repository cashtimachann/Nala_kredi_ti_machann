using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalaCreditAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerCodeColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SavingsCustomerDocuments_CustomerId",
                table: "SavingsCustomerDocuments");

            migrationBuilder.AddColumn<string>(
                name: "CustomerCode",
                table: "SavingsCustomers",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SavingsCustomerDocuments_CustomerId_DocumentType",
                table: "SavingsCustomerDocuments",
                columns: new[] { "CustomerId", "DocumentType" });

            migrationBuilder.CreateIndex(
                name: "IX_SavingsCustomerDocuments_UploadedAt",
                table: "SavingsCustomerDocuments",
                column: "UploadedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SavingsCustomerDocuments_CustomerId_DocumentType",
                table: "SavingsCustomerDocuments");

            migrationBuilder.DropIndex(
                name: "IX_SavingsCustomerDocuments_UploadedAt",
                table: "SavingsCustomerDocuments");

            migrationBuilder.DropColumn(
                name: "CustomerCode",
                table: "SavingsCustomers");

            migrationBuilder.CreateIndex(
                name: "IX_SavingsCustomerDocuments_CustomerId",
                table: "SavingsCustomerDocuments",
                column: "CustomerId");
        }
    }
}
