using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalaCreditAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddClientAccounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SavingsCustomers_Email",
                table: "SavingsCustomers");

            migrationBuilder.DropIndex(
                name: "IX_Employees_Email",
                table: "Employees");

            migrationBuilder.DropIndex(
                name: "IX_Employees_NationalId",
                table: "Employees");

            migrationBuilder.RenameColumn(
                name: "Phone",
                table: "Branches",
                newName: "Code");

            migrationBuilder.AddColumn<TimeSpan>(
                name: "CloseTime",
                table: "Branches",
                type: "interval",
                nullable: false,
                defaultValue: new TimeSpan(0, 0, 0, 0, 0));

            migrationBuilder.AddColumn<List<int>>(
                name: "ClosedDays",
                table: "Branches",
                type: "integer[]",
                nullable: false,
                defaultValue: new List<int>());

            migrationBuilder.AddColumn<string>(
                name: "Commune",
                table: "Branches",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DailyDepositLimit",
                table: "Branches",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "DailyWithdrawalLimit",
                table: "Branches",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Department",
                table: "Branches",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Branches",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ManagerId",
                table: "Branches",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ManagerId1",
                table: "Branches",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ManagerName",
                table: "Branches",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxEmployees",
                table: "Branches",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "MaxLocalCreditApproval",
                table: "Branches",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MinCashReserveHTG",
                table: "Branches",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MinCashReserveUSD",
                table: "Branches",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "OpenTime",
                table: "Branches",
                type: "interval",
                nullable: false,
                defaultValue: new TimeSpan(0, 0, 0, 0, 0));

            migrationBuilder.AddColumn<DateTime>(
                name: "OpeningDate",
                table: "Branches",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<List<string>>(
                name: "Phones",
                table: "Branches",
                type: "text[]",
                nullable: false,
                defaultValue: new List<string>());

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Branches",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateTable(
                name: "CurrentAccounts",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    AccountNumber = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    CustomerId = table.Column<string>(type: "text", nullable: false),
                    BranchId = table.Column<int>(type: "integer", nullable: false),
                    Currency = table.Column<int>(type: "integer", nullable: false),
                    Balance = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    AvailableBalance = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    MinimumBalance = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    OpeningDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastTransactionDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    DailyWithdrawalLimit = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    MonthlyWithdrawalLimit = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    DailyDepositLimit = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    OverdraftLimit = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    MaintenanceFee = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TransactionFee = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ClosedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ClosedBy = table.Column<string>(type: "text", nullable: true),
                    ClosureReason = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CurrentAccounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CurrentAccounts_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CurrentAccounts_SavingsCustomers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "SavingsCustomers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "InterBranchTransfers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TransferNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    FromBranchId = table.Column<int>(type: "integer", nullable: false),
                    FromBranchName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ToBranchId = table.Column<int>(type: "integer", nullable: false),
                    ToBranchName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Currency = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    ExchangeRate = table.Column<decimal>(type: "numeric", nullable: false),
                    ConvertedAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    RequestedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    RequestedByName = table.Column<string>(type: "text", nullable: true),
                    RequestedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ApprovedBy = table.Column<string>(type: "text", nullable: true),
                    ApprovedByName = table.Column<string>(type: "text", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RejectedBy = table.Column<string>(type: "text", nullable: true),
                    RejectedByName = table.Column<string>(type: "text", nullable: true),
                    RejectionReason = table.Column<string>(type: "text", nullable: true),
                    RejectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ProcessedBy = table.Column<string>(type: "text", nullable: true),
                    ProcessedByName = table.Column<string>(type: "text", nullable: true),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReferenceNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    TrackingNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InterBranchTransfers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InterBranchTransfers_Branches_FromBranchId",
                        column: x => x.FromBranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InterBranchTransfers_Branches_ToBranchId",
                        column: x => x.ToBranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TermSavingsAccounts",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    AccountNumber = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    CustomerId = table.Column<string>(type: "text", nullable: false),
                    BranchId = table.Column<int>(type: "integer", nullable: false),
                    Currency = table.Column<int>(type: "integer", nullable: false),
                    Balance = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    AvailableBalance = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TermType = table.Column<int>(type: "integer", nullable: false),
                    OpeningDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    MaturityDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastTransactionDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    InterestRate = table.Column<decimal>(type: "numeric(8,6)", nullable: false),
                    AccruedInterest = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    LastInterestCalculation = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EarlyWithdrawalPenalty = table.Column<decimal>(type: "numeric(8,6)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ClosedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ClosedBy = table.Column<string>(type: "text", nullable: true),
                    ClosureReason = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TermSavingsAccounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TermSavingsAccounts_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TermSavingsAccounts_SavingsCustomers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "SavingsCustomers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CurrentAccountTransactions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    AccountId = table.Column<string>(type: "text", nullable: false),
                    AccountNumber = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Currency = table.Column<int>(type: "integer", nullable: false),
                    BalanceBefore = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    BalanceAfter = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Reference = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ProcessedBy = table.Column<string>(type: "text", nullable: false),
                    BranchId = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Fees = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    ExchangeRate = table.Column<decimal>(type: "numeric(10,6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CurrentAccountTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CurrentAccountTransactions_AspNetUsers_ProcessedBy",
                        column: x => x.ProcessedBy,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CurrentAccountTransactions_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CurrentAccountTransactions_CurrentAccounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "CurrentAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InterBranchTransferLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TransferId = table.Column<Guid>(type: "uuid", nullable: false),
                    Action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    PerformedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PerformedByName = table.Column<string>(type: "text", nullable: true),
                    PerformedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    OldValue = table.Column<string>(type: "text", nullable: true),
                    NewValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InterBranchTransferLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InterBranchTransferLogs_InterBranchTransfers_TransferId",
                        column: x => x.TransferId,
                        principalTable: "InterBranchTransfers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TermSavingsTransactions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    AccountId = table.Column<string>(type: "text", nullable: false),
                    AccountNumber = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Currency = table.Column<int>(type: "integer", nullable: false),
                    BalanceBefore = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    BalanceAfter = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Reference = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ProcessedBy = table.Column<string>(type: "text", nullable: false),
                    BranchId = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Fees = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    ExchangeRate = table.Column<decimal>(type: "numeric(10,6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TermSavingsTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TermSavingsTransactions_AspNetUsers_ProcessedBy",
                        column: x => x.ProcessedBy,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TermSavingsTransactions_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TermSavingsTransactions_TermSavingsAccounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "TermSavingsAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SavingsCustomers_Email",
                table: "SavingsCustomers",
                column: "Email",
                unique: true,
                filter: "\"Email\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_Email",
                table: "Employees",
                column: "Email",
                unique: true,
                filter: "\"Email\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_NationalId",
                table: "Employees",
                column: "NationalId",
                unique: true,
                filter: "\"NationalId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Branches_ManagerId1",
                table: "Branches",
                column: "ManagerId1");

            migrationBuilder.CreateIndex(
                name: "IX_CurrentAccounts_AccountNumber",
                table: "CurrentAccounts",
                column: "AccountNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CurrentAccounts_BranchId",
                table: "CurrentAccounts",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_CurrentAccounts_CustomerId",
                table: "CurrentAccounts",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_CurrentAccounts_OpeningDate",
                table: "CurrentAccounts",
                column: "OpeningDate");

            migrationBuilder.CreateIndex(
                name: "IX_CurrentAccounts_Status_Currency",
                table: "CurrentAccounts",
                columns: new[] { "Status", "Currency" });

            migrationBuilder.CreateIndex(
                name: "IX_CurrentAccountTransactions_AccountId_ProcessedAt",
                table: "CurrentAccountTransactions",
                columns: new[] { "AccountId", "ProcessedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CurrentAccountTransactions_BranchId",
                table: "CurrentAccountTransactions",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_CurrentAccountTransactions_ProcessedAt",
                table: "CurrentAccountTransactions",
                column: "ProcessedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CurrentAccountTransactions_ProcessedBy",
                table: "CurrentAccountTransactions",
                column: "ProcessedBy");

            migrationBuilder.CreateIndex(
                name: "IX_CurrentAccountTransactions_Reference",
                table: "CurrentAccountTransactions",
                column: "Reference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CurrentAccountTransactions_Type_Status",
                table: "CurrentAccountTransactions",
                columns: new[] { "Type", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_InterBranchTransferLogs_TransferId_PerformedAt",
                table: "InterBranchTransferLogs",
                columns: new[] { "TransferId", "PerformedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_InterBranchTransfers_ApprovedBy",
                table: "InterBranchTransfers",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_InterBranchTransfers_FromBranchId_CreatedAt",
                table: "InterBranchTransfers",
                columns: new[] { "FromBranchId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_InterBranchTransfers_ProcessedBy",
                table: "InterBranchTransfers",
                column: "ProcessedBy");

            migrationBuilder.CreateIndex(
                name: "IX_InterBranchTransfers_RequestedBy",
                table: "InterBranchTransfers",
                column: "RequestedBy");

            migrationBuilder.CreateIndex(
                name: "IX_InterBranchTransfers_Status_CreatedAt",
                table: "InterBranchTransfers",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_InterBranchTransfers_ToBranchId_CreatedAt",
                table: "InterBranchTransfers",
                columns: new[] { "ToBranchId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_InterBranchTransfers_TransferNumber",
                table: "InterBranchTransfers",
                column: "TransferNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TermSavingsAccounts_AccountNumber",
                table: "TermSavingsAccounts",
                column: "AccountNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TermSavingsAccounts_BranchId",
                table: "TermSavingsAccounts",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_TermSavingsAccounts_CustomerId",
                table: "TermSavingsAccounts",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_TermSavingsAccounts_MaturityDate",
                table: "TermSavingsAccounts",
                column: "MaturityDate");

            migrationBuilder.CreateIndex(
                name: "IX_TermSavingsAccounts_OpeningDate",
                table: "TermSavingsAccounts",
                column: "OpeningDate");

            migrationBuilder.CreateIndex(
                name: "IX_TermSavingsAccounts_Status_Currency",
                table: "TermSavingsAccounts",
                columns: new[] { "Status", "Currency" });

            migrationBuilder.CreateIndex(
                name: "IX_TermSavingsTransactions_AccountId_ProcessedAt",
                table: "TermSavingsTransactions",
                columns: new[] { "AccountId", "ProcessedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_TermSavingsTransactions_BranchId",
                table: "TermSavingsTransactions",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_TermSavingsTransactions_ProcessedAt",
                table: "TermSavingsTransactions",
                column: "ProcessedAt");

            migrationBuilder.CreateIndex(
                name: "IX_TermSavingsTransactions_ProcessedBy",
                table: "TermSavingsTransactions",
                column: "ProcessedBy");

            migrationBuilder.CreateIndex(
                name: "IX_TermSavingsTransactions_Reference",
                table: "TermSavingsTransactions",
                column: "Reference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TermSavingsTransactions_Type_Status",
                table: "TermSavingsTransactions",
                columns: new[] { "Type", "Status" });

            migrationBuilder.AddForeignKey(
                name: "FK_Branches_AspNetUsers_ManagerId1",
                table: "Branches",
                column: "ManagerId1",
                principalTable: "AspNetUsers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Branches_AspNetUsers_ManagerId1",
                table: "Branches");

            migrationBuilder.DropTable(
                name: "CurrentAccountTransactions");

            migrationBuilder.DropTable(
                name: "InterBranchTransferLogs");

            migrationBuilder.DropTable(
                name: "TermSavingsTransactions");

            migrationBuilder.DropTable(
                name: "CurrentAccounts");

            migrationBuilder.DropTable(
                name: "InterBranchTransfers");

            migrationBuilder.DropTable(
                name: "TermSavingsAccounts");

            migrationBuilder.DropIndex(
                name: "IX_SavingsCustomers_Email",
                table: "SavingsCustomers");

            migrationBuilder.DropIndex(
                name: "IX_Employees_Email",
                table: "Employees");

            migrationBuilder.DropIndex(
                name: "IX_Employees_NationalId",
                table: "Employees");

            migrationBuilder.DropIndex(
                name: "IX_Branches_ManagerId1",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "CloseTime",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "ClosedDays",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "Commune",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "DailyDepositLimit",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "DailyWithdrawalLimit",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "Department",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "ManagerId",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "ManagerId1",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "ManagerName",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "MaxEmployees",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "MaxLocalCreditApproval",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "MinCashReserveHTG",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "MinCashReserveUSD",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "OpenTime",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "OpeningDate",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "Phones",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Branches");

            migrationBuilder.RenameColumn(
                name: "Code",
                table: "Branches",
                newName: "Phone");

            migrationBuilder.CreateIndex(
                name: "IX_SavingsCustomers_Email",
                table: "SavingsCustomers",
                column: "Email",
                unique: true,
                filter: "Email IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_Email",
                table: "Employees",
                column: "Email",
                unique: true,
                filter: "Email IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_NationalId",
                table: "Employees",
                column: "NationalId",
                unique: true,
                filter: "NationalId IS NOT NULL");
        }
    }
}
