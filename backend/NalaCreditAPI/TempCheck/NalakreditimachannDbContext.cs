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

            entity.HasIndex(e => new { e.Status, e.LoanType }, "IX_microcredit_loan_applications_Status_LoanType");

            entity.HasIndex(e => e.SubmittedAt, "IX_microcredit_loan_applications_SubmittedAt");

            entity.Property(e => e.Id).ValueGeneratedNever();
            entity.Property(e => e.ApplicationNumber).HasMaxLength(20);
            entity.Property(e => e.ApprovedAt).HasColumnType("timestamp without time zone");
            entity.Property(e => e.BlockedGuaranteeAmount).HasPrecision(18, 2);
            entity.Property(e => e.BranchName).HasMaxLength(100);
            entity.Property(e => e.CollateralValue).HasPrecision(18, 2);
            entity.Property(e => e.CreatedAt).HasColumnType("timestamp without time zone");
            entity.Property(e => e.DebtToIncomeRatio).HasPrecision(5, 4);
            entity.Property(e => e.ExistingDebts).HasPrecision(18, 2);
            entity.Property(e => e.LoanOfficerName).HasMaxLength(100);
            entity.Property(e => e.MonthlyExpenses).HasPrecision(18, 2);
            entity.Property(e => e.MonthlyIncome).HasPrecision(18, 2);
            entity.Property(e => e.Purpose).HasMaxLength(500);
            entity.Property(e => e.RejectedAt).HasColumnType("timestamp without time zone");
            entity.Property(e => e.RejectionReason).HasMaxLength(500);
            entity.Property(e => e.RequestedAmount).HasPrecision(18, 2);
            entity.Property(e => e.ReviewedAt).HasColumnType("timestamp without time zone");
            entity.Property(e => e.SubmittedAt).HasColumnType("timestamp without time zone");
            entity.Property(e => e.UpdatedAt).HasColumnType("timestamp without time zone");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
