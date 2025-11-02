using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalaCreditAPI.Migrations
{
    /// <inheritdoc />
    public partial class CurrentAccount_KYC_Signers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CompanyName",
                table: "SavingsCustomers",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsBusiness",
                table: "SavingsCustomers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "LegalForm",
                table: "SavingsCustomers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReferencePersonName",
                table: "SavingsCustomers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReferencePersonPhone",
                table: "SavingsCustomers",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RepresentativeDocumentNumber",
                table: "SavingsCustomers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RepresentativeDocumentType",
                table: "SavingsCustomers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RepresentativeExpiryDate",
                table: "SavingsCustomers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RepresentativeFirstName",
                table: "SavingsCustomers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RepresentativeIssuedDate",
                table: "SavingsCustomers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RepresentativeIssuingAuthority",
                table: "SavingsCustomers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RepresentativeLastName",
                table: "SavingsCustomers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TaxId",
                table: "SavingsCustomers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TradeRegisterNumber",
                table: "SavingsCustomers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AccountPurpose",
                table: "CurrentAccounts",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DepositMethod",
                table: "CurrentAccounts",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OriginOfFunds",
                table: "CurrentAccounts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PinHash",
                table: "CurrentAccounts",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SecurityAnswerHash",
                table: "CurrentAccounts",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SecurityQuestion",
                table: "CurrentAccounts",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TransactionFrequency",
                table: "CurrentAccounts",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CurrentAccountAuthorizedSigners",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    AccountId = table.Column<string>(type: "text", nullable: false),
                    FullName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    DocumentNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CurrentAccountAuthorizedSigners", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CurrentAccountAuthorizedSigners_CurrentAccounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "CurrentAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CurrentAccountAuthorizedSigners_AccountId_FullName",
                table: "CurrentAccountAuthorizedSigners",
                columns: new[] { "AccountId", "FullName" });

            migrationBuilder.CreateIndex(
                name: "IX_CurrentAccountAuthorizedSigners_AccountId_IsActive",
                table: "CurrentAccountAuthorizedSigners",
                columns: new[] { "AccountId", "IsActive" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CurrentAccountAuthorizedSigners");

            migrationBuilder.DropColumn(
                name: "CompanyName",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "IsBusiness",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "LegalForm",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "ReferencePersonName",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "ReferencePersonPhone",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "RepresentativeDocumentNumber",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "RepresentativeDocumentType",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "RepresentativeExpiryDate",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "RepresentativeFirstName",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "RepresentativeIssuedDate",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "RepresentativeIssuingAuthority",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "RepresentativeLastName",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "TaxId",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "TradeRegisterNumber",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "AccountPurpose",
                table: "CurrentAccounts");

            migrationBuilder.DropColumn(
                name: "DepositMethod",
                table: "CurrentAccounts");

            migrationBuilder.DropColumn(
                name: "OriginOfFunds",
                table: "CurrentAccounts");

            migrationBuilder.DropColumn(
                name: "PinHash",
                table: "CurrentAccounts");

            migrationBuilder.DropColumn(
                name: "SecurityAnswerHash",
                table: "CurrentAccounts");

            migrationBuilder.DropColumn(
                name: "SecurityQuestion",
                table: "CurrentAccounts");

            migrationBuilder.DropColumn(
                name: "TransactionFrequency",
                table: "CurrentAccounts");
        }
    }
}
