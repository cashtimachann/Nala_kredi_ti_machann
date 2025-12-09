using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalaCreditAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddSavingsAccountSuspensionMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "SuspendedAt",
                table: "SavingsAccounts",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SuspendedBy",
                table: "SavingsAccounts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SuspensionReason",
                table: "SavingsAccounts",
                type: "text",
                nullable: true);

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""SavingsAccountAuthorizedSigners"" (
    ""Id"" VARCHAR(36) PRIMARY KEY,
    ""AccountId"" VARCHAR(36) NOT NULL,
    ""FullName"" VARCHAR(100) NOT NULL,
    ""Role"" VARCHAR(50),
    ""DocumentType"" INTEGER,
    ""DocumentNumber"" VARCHAR(50),
    ""Phone"" VARCHAR(20),
    ""RelationshipToCustomer"" VARCHAR(100),
    ""Address"" VARCHAR(300),
    ""Signature"" TEXT,
    ""PhotoUrl"" VARCHAR(500),
    ""AuthorizationLimit"" NUMERIC(18,2),
    ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE,
    ""CreatedAt"" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ""UpdatedAt"" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ""FK_SavingsAccountAuthorizedSigners_SavingsAccounts""
        FOREIGN KEY (""AccountId"") REFERENCES ""SavingsAccounts""(""Id"") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ""IX_SavingsAccountAuthorizedSigners_AccountId""
    ON ""SavingsAccountAuthorizedSigners""(""AccountId"");

CREATE INDEX IF NOT EXISTS ""IX_SavingsAccountAuthorizedSigners_IsActive""
    ON ""SavingsAccountAuthorizedSigners""(""IsActive"");

SELECT 'SavingsAccountAuthorizedSigners ensured by migration' AS ""Message"";
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SuspendedAt",
                table: "SavingsAccounts");

            migrationBuilder.DropColumn(
                name: "SuspendedBy",
                table: "SavingsAccounts");

            migrationBuilder.DropColumn(
                name: "SuspensionReason",
                table: "SavingsAccounts");
        }
    }
}
