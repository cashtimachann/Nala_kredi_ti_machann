using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalaCreditAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddMissingCustomerFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AcceptTerms",
                table: "SavingsCustomers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "BirthPlace",
                table: "SavingsCustomers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompanyEmail",
                table: "SavingsCustomers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompanyPhone",
                table: "SavingsCustomers",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EducationLevel",
                table: "SavingsCustomers",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmployerName",
                table: "SavingsCustomers",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HeadOfficeAddress",
                table: "SavingsCustomers",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IncomeSource",
                table: "SavingsCustomers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MaritalStatus",
                table: "SavingsCustomers",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Nationality",
                table: "SavingsCustomers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "NumberOfDependents",
                table: "SavingsCustomers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PersonalNif",
                table: "SavingsCustomers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RepresentativeTitle",
                table: "SavingsCustomers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SignatureDate",
                table: "SavingsCustomers",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SignaturePlace",
                table: "SavingsCustomers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WorkAddress",
                table: "SavingsCustomers",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "CurrentAccountAuthorizedSigners",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AuthorizationLimit",
                table: "CurrentAccountAuthorizedSigners",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DocumentType",
                table: "CurrentAccountAuthorizedSigners",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhotoUrl",
                table: "CurrentAccountAuthorizedSigners",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RelationshipToCustomer",
                table: "CurrentAccountAuthorizedSigners",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Signature",
                table: "CurrentAccountAuthorizedSigners",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AcceptTerms",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "BirthPlace",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "CompanyEmail",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "CompanyPhone",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "EducationLevel",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "EmployerName",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "HeadOfficeAddress",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "IncomeSource",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "MaritalStatus",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "Nationality",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "NumberOfDependents",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "PersonalNif",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "RepresentativeTitle",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "SignatureDate",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "SignaturePlace",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "WorkAddress",
                table: "SavingsCustomers");

            migrationBuilder.DropColumn(
                name: "Address",
                table: "CurrentAccountAuthorizedSigners");

            migrationBuilder.DropColumn(
                name: "AuthorizationLimit",
                table: "CurrentAccountAuthorizedSigners");

            migrationBuilder.DropColumn(
                name: "DocumentType",
                table: "CurrentAccountAuthorizedSigners");

            migrationBuilder.DropColumn(
                name: "PhotoUrl",
                table: "CurrentAccountAuthorizedSigners");

            migrationBuilder.DropColumn(
                name: "RelationshipToCustomer",
                table: "CurrentAccountAuthorizedSigners");

            migrationBuilder.DropColumn(
                name: "Signature",
                table: "CurrentAccountAuthorizedSigners");
        }
    }
}
