using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace NalaCreditAPI.TempCheck;

public partial class NalakreditimachannDbContext : DbContext
{
    public NalakreditimachannDbContext()
    {
    }

    public NalakreditimachannDbContext(DbContextOptions<NalakreditimachannDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<MicrocreditLoanApplication> MicrocreditLoanApplications { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        => optionsBuilder.UseNpgsql("Name=ConnectionStrings:DefaultConnection");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MicrocreditLoanApplication>(entity =>
        {
            entity.ToTable("microcredit_loan_applications");

            entity.HasIndex(e => e.ApplicationNumber, "IX_microcredit_loan_applications_ApplicationNumber").IsUnique();

            entity.HasIndex(e => e.BorrowerId, "IX_microcredit_loan_applications_BorrowerId");

            entity.HasIndex(e => new { e.BranchId, e.Status }, "IX_microcredit_loan_applications_BranchId_Status");

            entity.HasIndex(e => e.CollateralType, "IX_microcredit_loan_applications_CollateralType");

            entity.HasIndex(e => e.HasCollateralDocs, "IX_microcredit_loan_applications_HasCollateralDocs");

            entity.HasIndex(e => e.HasNationalId, "IX_microcredit_loan_applications_HasNationalId");

            entity.HasIndex(e => e.HasProofOfIncome, "IX_microcredit_loan_applications_HasProofOfIncome");

            entity.HasIndex(e => e.HasProofOfResidence, "IX_microcredit_loan_applications_HasProofOfResidence");

            entity.HasIndex(e => e.InterestRate, "IX_microcredit_loan_applications_InterestRate");

            entity.HasIndex(e => e.MonthlyInterestRate, "IX_microcredit_loan_applications_MonthlyInterestRate");

            entity.HasIndex(e => new { e.Status, e.LoanType }, "IX_microcredit_loan_applications_Status_LoanType");

            entity.HasIndex(e => e.SubmittedAt, "IX_microcredit_loan_applications_SubmittedAt");

            entity.Property(e => e.Id).ValueGeneratedNever();
            entity.Property(e => e.ApplicationNumber).HasMaxLength(20);
            entity.Property(e => e.ApprovedAt).HasColumnType("timestamp without time zone");
            entity.Property(e => e.BlockedGuaranteeAmount).HasPrecision(18, 2);
            entity.Property(e => e.BranchName).HasMaxLength(100);
            entity.Property(e => e.CollateralType).HasMaxLength(200);
            entity.Property(e => e.CollateralValue).HasPrecision(18, 2);
            entity.Property(e => e.CreatedAt).HasColumnType("timestamp without time zone");
            entity.Property(e => e.DebtToIncomeRatio).HasPrecision(5, 4);
            entity.Property(e => e.Dependents).HasDefaultValue(0);
            entity.Property(e => e.DisbursementDate).HasColumnType("timestamp without time zone");
            entity.Property(e => e.ExistingDebts).HasPrecision(18, 2);
            entity.Property(e => e.Guarantor1Name).HasMaxLength(100);
            entity.Property(e => e.Guarantor1Phone).HasMaxLength(20);
            entity.Property(e => e.Guarantor1Relation).HasMaxLength(50);
            entity.Property(e => e.Guarantor2Name).HasMaxLength(100);
            entity.Property(e => e.Guarantor2Phone).HasMaxLength(20);
            entity.Property(e => e.Guarantor2Relation).HasMaxLength(50);
            entity.Property(e => e.HasCollateralDocs).HasDefaultValue(false);
            entity.Property(e => e.HasNationalId).HasDefaultValue(false);
            entity.Property(e => e.HasProofOfIncome).HasDefaultValue(false);
            entity.Property(e => e.HasProofOfResidence).HasDefaultValue(false);
            entity.Property(e => e.InterestRate).HasPrecision(5, 4);
            entity.Property(e => e.LoanOfficerName).HasMaxLength(100);
            entity.Property(e => e.MonthlyExpenses).HasPrecision(18, 2);
            entity.Property(e => e.MonthlyIncome).HasPrecision(18, 2);
            entity.Property(e => e.MonthlyInterestRate).HasPrecision(5, 4);
            entity.Property(e => e.Purpose).HasMaxLength(500);
            entity.Property(e => e.Reference1Name).HasMaxLength(100);
            entity.Property(e => e.Reference1Phone).HasMaxLength(20);
            entity.Property(e => e.Reference2Name).HasMaxLength(100);
            entity.Property(e => e.Reference2Phone).HasMaxLength(20);
            entity.Property(e => e.RejectedAt).HasColumnType("timestamp without time zone");
            entity.Property(e => e.RejectionReason).HasMaxLength(500);
            entity.Property(e => e.RequestedAmount).HasPrecision(18, 2);
            entity.Property(e => e.ReviewedAt).HasColumnType("timestamp without time zone");
            entity.Property(e => e.SavingsAccountNumber)
                .HasMaxLength(12)
                .HasDefaultValueSql("''::character varying");
            entity.Property(e => e.SubmittedAt).HasColumnType("timestamp without time zone");
            entity.Property(e => e.UpdatedAt).HasColumnType("timestamp without time zone");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
