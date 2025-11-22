using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalaCreditAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddMissingLoanApplicationFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TermSavingsAccounts_CustomerId",
                table: "TermSavingsAccounts");

            migrationBuilder.DropIndex(
                name: "IX_SavingsAccounts_CustomerId",
                table: "SavingsAccounts");

            migrationBuilder.DropIndex(
                name: "IX_CurrentAccounts_CustomerId",
                table: "CurrentAccounts");

            // Add missing fields to microcredit_loan_applications table
            migrationBuilder.AddColumn<int>(
                name: "Dependents",
                table: "microcredit_loan_applications",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "InterestRate",
                table: "microcredit_loan_applications",
                type: "numeric(5,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyInterestRate",
                table: "microcredit_loan_applications",
                type: "numeric(5,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "CollateralType",
                table: "microcredit_loan_applications",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CollateralDescription",
                table: "microcredit_loan_applications",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Guarantor1Name",
                table: "microcredit_loan_applications",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Guarantor1Phone",
                table: "microcredit_loan_applications",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Guarantor1Relation",
                table: "microcredit_loan_applications",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Guarantor2Name",
                table: "microcredit_loan_applications",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Guarantor2Phone",
                table: "microcredit_loan_applications",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Guarantor2Relation",
                table: "microcredit_loan_applications",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Reference1Name",
                table: "microcredit_loan_applications",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Reference1Phone",
                table: "microcredit_loan_applications",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Reference2Name",
                table: "microcredit_loan_applications",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Reference2Phone",
                table: "microcredit_loan_applications",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "HasNationalId",
                table: "microcredit_loan_applications",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasProofOfResidence",
                table: "microcredit_loan_applications",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasProofOfIncome",
                table: "microcredit_loan_applications",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasCollateralDocs",
                table: "microcredit_loan_applications",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "microcredit_loan_applications",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TermSavingsAccounts_CustomerId_Currency_Unique",
                table: "TermSavingsAccounts",
                columns: new[] { "CustomerId", "Currency" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SavingsAccounts_CustomerId_Currency_Unique",
                table: "SavingsAccounts",
                columns: new[] { "CustomerId", "Currency" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CurrentAccounts_CustomerId_Currency_Unique",
                table: "CurrentAccounts",
                columns: new[] { "CustomerId", "Currency" },
                unique: true);

            // Add indexes for the new fields
            migrationBuilder.CreateIndex(
                name: "IX_microcredit_loan_applications_InterestRate",
                table: "microcredit_loan_applications",
                column: "InterestRate");

            migrationBuilder.CreateIndex(
                name: "IX_microcredit_loan_applications_MonthlyInterestRate",
                table: "microcredit_loan_applications",
                column: "MonthlyInterestRate");

            migrationBuilder.CreateIndex(
                name: "IX_microcredit_loan_applications_CollateralType",
                table: "microcredit_loan_applications",
                column: "CollateralType");

            migrationBuilder.CreateIndex(
                name: "IX_microcredit_loan_applications_HasNationalId",
                table: "microcredit_loan_applications",
                column: "HasNationalId");

            migrationBuilder.CreateIndex(
                name: "IX_microcredit_loan_applications_HasProofOfResidence",
                table: "microcredit_loan_applications",
                column: "HasProofOfResidence");

            migrationBuilder.CreateIndex(
                name: "IX_microcredit_loan_applications_HasProofOfIncome",
                table: "microcredit_loan_applications",
                column: "HasProofOfIncome");

            migrationBuilder.CreateIndex(
                name: "IX_microcredit_loan_applications_HasCollateralDocs",
                table: "microcredit_loan_applications",
                column: "HasCollateralDocs");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_microcredit_loan_applications_HasCollateralDocs",
                table: "microcredit_loan_applications");

            migrationBuilder.DropIndex(
                name: "IX_microcredit_loan_applications_HasProofOfIncome",
                table: "microcredit_loan_applications");

            migrationBuilder.DropIndex(
                name: "IX_microcredit_loan_applications_HasProofOfResidence",
                table: "microcredit_loan_applications");

            migrationBuilder.DropIndex(
                name: "IX_microcredit_loan_applications_HasNationalId",
                table: "microcredit_loan_applications");

            migrationBuilder.DropIndex(
                name: "IX_microcredit_loan_applications_CollateralType",
                table: "microcredit_loan_applications");

            migrationBuilder.DropIndex(
                name: "IX_microcredit_loan_applications_MonthlyInterestRate",
                table: "microcredit_loan_applications");

            migrationBuilder.DropIndex(
                name: "IX_microcredit_loan_applications_InterestRate",
                table: "microcredit_loan_applications");

            migrationBuilder.DropIndex(
                name: "IX_TermSavingsAccounts_CustomerId_Currency_Unique",
                table: "TermSavingsAccounts");

            migrationBuilder.DropIndex(
                name: "IX_SavingsAccounts_CustomerId_Currency_Unique",
                table: "SavingsAccounts");

            migrationBuilder.DropIndex(
                name: "IX_CurrentAccounts_CustomerId_Currency_Unique",
                table: "CurrentAccounts");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "HasCollateralDocs",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "HasProofOfIncome",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "HasProofOfResidence",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "HasNationalId",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "Reference2Phone",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "Reference2Name",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "Reference1Phone",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "Reference1Name",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "Guarantor2Relation",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "Guarantor2Phone",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "Guarantor2Name",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "Guarantor1Relation",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "Guarantor1Phone",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "Guarantor1Name",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "CollateralDescription",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "CollateralType",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "MonthlyInterestRate",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "InterestRate",
                table: "microcredit_loan_applications");

            migrationBuilder.DropColumn(
                name: "Dependents",
                table: "microcredit_loan_applications");

            migrationBuilder.CreateIndex(
                name: "IX_TermSavingsAccounts_CustomerId",
                table: "TermSavingsAccounts",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_SavingsAccounts_CustomerId",
                table: "SavingsAccounts",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_CurrentAccounts_CustomerId",
                table: "CurrentAccounts",
                column: "CustomerId");
        }
    }
}
