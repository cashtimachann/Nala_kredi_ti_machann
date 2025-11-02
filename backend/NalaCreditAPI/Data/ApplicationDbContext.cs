using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Models;

namespace NalaCreditAPI.Data;

public class ApplicationDbContext : IdentityDbContext<User>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Branch> Branches { get; set; }
    public DbSet<Customer> Customers { get; set; }
    public DbSet<CustomerContact> CustomerContacts { get; set; }
    public DbSet<Account> Accounts { get; set; }
    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<CreditApplication> CreditApplications { get; set; }
    public DbSet<Credit> Credits { get; set; }
    public DbSet<CreditPayment> CreditPayments { get; set; }
    public DbSet<CashSession> CashSessions { get; set; }
    public DbSet<SystemConfiguration> SystemConfigurations { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    
    // Savings Module DbSets
    public DbSet<SavingsCustomer> SavingsCustomers { get; set; }
    public DbSet<SavingsCustomerDocument> SavingsCustomerDocuments { get; set; }
    public DbSet<SavingsAccount> SavingsAccounts { get; set; }
    public DbSet<SavingsTransaction> SavingsTransactions { get; set; }
    
    // Client Accounts Module DbSets
    public DbSet<CurrentAccount> CurrentAccounts { get; set; }
      public DbSet<CurrentAccountAuthorizedSigner> CurrentAccountAuthorizedSigners { get; set; }
    public DbSet<TermSavingsAccount> TermSavingsAccounts { get; set; }
    public DbSet<CurrentAccountTransaction> CurrentAccountTransactions { get; set; }
    public DbSet<TermSavingsTransaction> TermSavingsTransactions { get; set; }
    
    // Microcredit Module DbSets
    public DbSet<MicrocreditLoanTypeConfiguration> MicrocreditLoanTypeConfigurations { get; set; }
    public DbSet<MicrocreditBorrower> MicrocreditBorrowers { get; set; }
    public DbSet<MicrocreditLoanApplication> MicrocreditLoanApplications { get; set; }
    public DbSet<MicrocreditApplicationDocument> MicrocreditApplicationDocuments { get; set; }
    public DbSet<MicrocreditGuarantee> MicrocreditGuarantees { get; set; }
    public DbSet<MicrocreditApprovalStep> MicrocreditApprovalSteps { get; set; }
    public DbSet<MicrocreditLoan> MicrocreditLoans { get; set; }
    public DbSet<MicrocreditPaymentSchedule> MicrocreditPaymentSchedules { get; set; }
    public DbSet<MicrocreditPayment> MicrocreditPayments { get; set; }
    
    // Payroll Module DbSets
    public DbSet<Employee> Employees { get; set; }
    public DbSet<PayrollPeriod> PayrollPeriods { get; set; }
    public DbSet<Payslip> Payslips { get; set; }
    public DbSet<PayslipDeduction> PayslipDeductions { get; set; }
    public DbSet<SalaryAdvance> SalaryAdvances { get; set; }
    public DbSet<SalaryAdvanceDeduction> SalaryAdvanceDeductions { get; set; }
    
    // Currency Exchange Module DbSets
    public DbSet<CurrencyExchangeRate> CurrencyExchangeRates { get; set; }
    public DbSet<ExchangeTransaction> ExchangeTransactions { get; set; }
    public DbSet<CurrencyReserve> CurrencyReserves { get; set; }
    public DbSet<CurrencyMovement> CurrencyMovements { get; set; }

    // Inter-Branch Transfer Module DbSets
    public DbSet<InterBranchTransfer> InterBranchTransfers { get; set; }
    public DbSet<InterBranchTransferLog> InterBranchTransferLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // User configurations
        builder.Entity<User>(entity =>
        {
            entity.HasOne(u => u.Branch)
                  .WithMany(b => b.Users)
                  .HasForeignKey(u => u.BranchId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasIndex(u => u.UserName).IsUnique();
        });

        // Branch configurations
        builder.Entity<Branch>(entity =>
        {
            entity.HasIndex(b => b.Name).IsUnique();
        });

        // Customer configurations
        builder.Entity<Customer>(entity =>
        {
            entity.HasIndex(c => new { c.FirstName, c.LastName, c.Phone });
        });

        // Account configurations
        builder.Entity<Account>(entity =>
        {
            entity.HasOne(a => a.Customer)
                  .WithMany(c => c.Accounts)
                  .HasForeignKey(a => a.CustomerId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(a => a.Branch)
                  .WithMany(b => b.Accounts)
                  .HasForeignKey(a => a.BranchId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(a => a.AccountNumber).IsUnique();
        });

        // Transaction configurations
        builder.Entity<Transaction>(entity =>
        {
            entity.HasOne(t => t.Account)
                  .WithMany(a => a.Transactions)
                  .HasForeignKey(t => t.AccountId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(t => t.Branch)
                  .WithMany(b => b.Transactions)
                  .HasForeignKey(t => t.BranchId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(t => t.User)
                  .WithMany(u => u.Transactions)
                  .HasForeignKey(t => t.UserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(t => t.CashSession)
                  .WithMany(cs => cs.Transactions)
                  .HasForeignKey(t => t.CashSessionId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(t => t.TransactionNumber).IsUnique();
            entity.HasIndex(t => new { t.CreatedAt, t.BranchId });
        });

        // Credit Application configurations
        builder.Entity<CreditApplication>(entity =>
        {
            entity.HasOne(ca => ca.Customer)
                  .WithMany(c => c.CreditApplications)
                  .HasForeignKey(ca => ca.CustomerId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ca => ca.Agent)
                  .WithMany(u => u.CreditApplications)
                  .HasForeignKey(ca => ca.AgentId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(ca => ca.Reviewer)
                  .WithMany()
                  .HasForeignKey(ca => ca.ReviewedBy)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(ca => ca.ApplicationNumber).IsUnique();
        });

        // Credit configurations
        builder.Entity<Credit>(entity =>
        {
            entity.HasOne(c => c.Application)
                  .WithOne(ca => ca.Credit)
                  .HasForeignKey<Credit>(c => c.ApplicationId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(c => c.Account)
                  .WithMany(a => a.Credits)
                  .HasForeignKey(c => c.AccountId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(c => c.CreditNumber).IsUnique();
            entity.HasIndex(c => new { c.Status, c.NextPaymentDate });
        });

        // Credit Payment configurations
        builder.Entity<CreditPayment>(entity =>
        {
            entity.HasOne(cp => cp.Credit)
                  .WithMany(c => c.Payments)
                  .HasForeignKey(cp => cp.CreditId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(cp => cp.Transaction)
                  .WithOne()
                  .HasForeignKey<CreditPayment>(cp => cp.TransactionId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Cash Session configurations
        builder.Entity<CashSession>(entity =>
        {
            entity.HasOne(cs => cs.User)
                  .WithMany(u => u.CashSessions)
                  .HasForeignKey(cs => cs.UserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(cs => cs.Branch)
                  .WithMany(b => b.CashSessions)
                  .HasForeignKey(cs => cs.BranchId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(cs => new { cs.UserId, cs.SessionStart });
        });

        // Customer Contact configurations
        builder.Entity<CustomerContact>(entity =>
        {
            entity.HasOne(cc => cc.Customer)
                  .WithMany()
                  .HasForeignKey(cc => cc.CustomerId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // System Configuration
        builder.Entity<SystemConfiguration>(entity =>
        {
            entity.HasIndex(sc => sc.Key).IsUnique();
        });

        // Audit Log configurations
        builder.Entity<AuditLog>(entity =>
        {
            entity.HasIndex(al => new { al.UserId, al.Timestamp });
            entity.HasIndex(al => new { al.EntityType, al.EntityId });
        });

        // Savings Module Configurations
        
        // Savings Customer configurations
        builder.Entity<SavingsCustomer>(entity =>
        {
            entity.HasIndex(sc => sc.PrimaryPhone).IsUnique();
            entity.HasIndex(sc => new { sc.DocumentType, sc.DocumentNumber }).IsUnique();
            entity.HasIndex(sc => sc.Email).IsUnique().HasFilter("\"Email\" IS NOT NULL");
            entity.HasIndex(sc => new { sc.FirstName, sc.LastName, sc.DateOfBirth });
        });

        // Savings Customer Document configurations
        builder.Entity<SavingsCustomerDocument>(entity =>
        {
            entity.HasOne(scd => scd.Customer)
                  .WithMany(sc => sc.Documents)
                  .HasForeignKey(scd => scd.CustomerId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(scd => new { scd.CustomerId, scd.DocumentType });
            entity.HasIndex(scd => scd.UploadedAt);
        });

        // Savings Account configurations
        builder.Entity<SavingsAccount>(entity =>
        {
            entity.HasOne(sa => sa.Customer)
                  .WithMany(sc => sc.SavingsAccounts)
                  .HasForeignKey(sa => sa.CustomerId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(sa => sa.Branch)
                  .WithMany()
                  .HasForeignKey(sa => sa.BranchId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(sa => sa.AccountNumber).IsUnique();
            entity.HasIndex(sa => new { sa.Status, sa.Currency });
            entity.HasIndex(sa => sa.OpeningDate);
        });

        // Savings Transaction configurations
        builder.Entity<SavingsTransaction>(entity =>
        {
            entity.HasOne(st => st.Account)
                  .WithMany(sa => sa.Transactions)
                  .HasForeignKey(st => st.AccountId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(st => st.ProcessedByUser)
                  .WithMany()
                  .HasForeignKey(st => st.ProcessedBy)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(st => st.Reference).IsUnique();
            entity.HasIndex(st => new { st.AccountId, st.ProcessedAt });
            entity.HasIndex(st => new { st.Type, st.Status });
            entity.HasIndex(st => st.ProcessedAt);
        });

        // Current Account configurations
        builder.Entity<CurrentAccount>(entity =>
        {
            entity.HasOne(ca => ca.Customer)
                  .WithMany()
                  .HasForeignKey(ca => ca.CustomerId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ca => ca.Branch)
                  .WithMany()
                  .HasForeignKey(ca => ca.BranchId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(ca => ca.AccountNumber).IsUnique();
            entity.HasIndex(ca => new { ca.Status, ca.Currency });
            entity.HasIndex(ca => ca.OpeningDate);
        });

            // Current Account Authorized Signer configurations
            builder.Entity<CurrentAccountAuthorizedSigner>(entity =>
            {
                  entity.HasOne(s => s.Account)
                          .WithMany(a => a.AuthorizedSigners)
                          .HasForeignKey(s => s.AccountId)
                          .OnDelete(DeleteBehavior.Cascade);

                  entity.HasIndex(s => new { s.AccountId, s.FullName });
                  entity.HasIndex(s => new { s.AccountId, s.IsActive });
            });

        // Term Savings Account configurations
        builder.Entity<TermSavingsAccount>(entity =>
        {
            entity.HasOne(tsa => tsa.Customer)
                  .WithMany()
                  .HasForeignKey(tsa => tsa.CustomerId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(tsa => tsa.Branch)
                  .WithMany()
                  .HasForeignKey(tsa => tsa.BranchId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(tsa => tsa.AccountNumber).IsUnique();
            entity.HasIndex(tsa => new { tsa.Status, tsa.Currency });
            entity.HasIndex(tsa => tsa.MaturityDate);
            entity.HasIndex(tsa => tsa.OpeningDate);
        });

        // Current Account Transaction configurations
        builder.Entity<CurrentAccountTransaction>(entity =>
        {
            entity.HasOne(cat => cat.Account)
                  .WithMany(ca => ca.Transactions)
                  .HasForeignKey(cat => cat.AccountId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(cat => cat.ProcessedByUser)
                  .WithMany()
                  .HasForeignKey(cat => cat.ProcessedBy)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(cat => cat.Reference).IsUnique();
            entity.HasIndex(cat => new { cat.AccountId, cat.ProcessedAt });
            entity.HasIndex(cat => new { cat.Type, cat.Status });
            entity.HasIndex(cat => cat.ProcessedAt);
        });

        // Term Savings Transaction configurations
        builder.Entity<TermSavingsTransaction>(entity =>
        {
            entity.HasOne(tst => tst.Account)
                  .WithMany(tsa => tsa.Transactions)
                  .HasForeignKey(tst => tst.AccountId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(tst => tst.ProcessedByUser)
                  .WithMany()
                  .HasForeignKey(tst => tst.ProcessedBy)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(tst => tst.Reference).IsUnique();
            entity.HasIndex(tst => new { tst.AccountId, tst.ProcessedAt });
            entity.HasIndex(tst => new { tst.Type, tst.Status });
            entity.HasIndex(tst => tst.ProcessedAt);
        });

        // Microcredit Module Configurations
        
        // Microcredit Loan Type Configuration
        builder.Entity<MicrocreditLoanTypeConfiguration>(entity =>
        {
            entity.HasIndex(ltc => ltc.Type).IsUnique();
        });

        // Microcredit Borrower configurations
        builder.Entity<MicrocreditBorrower>(entity =>
        {
            entity.HasIndex(mb => new { mb.FirstName, mb.LastName, mb.DateOfBirth });
            entity.HasIndex(mb => mb.CreatedAt);
        });

        // Microcredit Loan Application configurations
        builder.Entity<MicrocreditLoanApplication>(entity =>
        {
            entity.HasOne(mla => mla.Borrower)
                  .WithMany(mb => mb.LoanApplications)
                  .HasForeignKey(mla => mla.BorrowerId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(mla => mla.ApplicationNumber).IsUnique();
            entity.HasIndex(mla => new { mla.Status, mla.LoanType });
            entity.HasIndex(mla => new { mla.BranchId, mla.Status });
            entity.HasIndex(mla => mla.SubmittedAt);
        });

        // Microcredit Application Document configurations
        builder.Entity<MicrocreditApplicationDocument>(entity =>
        {
            entity.HasOne(mad => mad.Application)
                  .WithMany(mla => mla.Documents)
                  .HasForeignKey(mad => mad.ApplicationId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(mad => new { mad.ApplicationId, mad.Type });
        });

        // Microcredit Guarantee configurations
        builder.Entity<MicrocreditGuarantee>(entity =>
        {
            entity.HasOne(mg => mg.Application)
                  .WithMany(mla => mla.Guarantees)
                  .HasForeignKey(mg => mg.ApplicationId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(mg => new { mg.ApplicationId, mg.Type });
        });

        // Microcredit Approval Step configurations
        builder.Entity<MicrocreditApprovalStep>(entity =>
        {
            entity.HasOne(mas => mas.Application)
                  .WithMany(mla => mla.ApprovalSteps)
                  .HasForeignKey(mas => mas.ApplicationId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(mas => new { mas.ApplicationId, mas.Level });
        });

        // Microcredit Loan configurations
        builder.Entity<MicrocreditLoan>(entity =>
        {
            entity.HasOne(ml => ml.Application)
                  .WithOne(mla => mla.ApprovedLoan)
                  .HasForeignKey<MicrocreditLoan>(ml => ml.ApplicationId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(ml => ml.Borrower)
                  .WithMany(mb => mb.Loans)
                  .HasForeignKey(ml => ml.BorrowerId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(ml => ml.LoanNumber).IsUnique();
            entity.HasIndex(ml => new { ml.Status, ml.LoanType });
            entity.HasIndex(ml => new { ml.BranchId, ml.Status });
            entity.HasIndex(ml => ml.DisbursementDate);
            entity.HasIndex(ml => ml.NextPaymentDue);
        });

        // Microcredit Payment Schedule configurations
        builder.Entity<MicrocreditPaymentSchedule>(entity =>
        {
            entity.HasOne(mps => mps.Loan)
                  .WithMany(ml => ml.PaymentSchedule)
                  .HasForeignKey(mps => mps.LoanId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(mps => new { mps.LoanId, mps.InstallmentNumber }).IsUnique();
            entity.HasIndex(mps => new { mps.DueDate, mps.Status });
        });

        // Microcredit Payment configurations
        builder.Entity<MicrocreditPayment>(entity =>
        {
            entity.HasOne(mp => mp.Loan)
                  .WithMany(ml => ml.Payments)
                  .HasForeignKey(mp => mp.LoanId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(mp => mp.PaymentNumber).IsUnique();
            entity.HasIndex(mp => new { mp.LoanId, mp.PaymentDate });
            entity.HasIndex(mp => mp.PaymentDate);
        });

        // Payroll Module Configurations
        
        // Employee configurations
        builder.Entity<Employee>(entity =>
        {
            entity.HasIndex(e => e.EmployeeCode).IsUnique();
            entity.HasIndex(e => new { e.FirstName, e.LastName, e.BranchId });
            entity.HasIndex(e => new { e.Status, e.BranchId });
            entity.HasIndex(e => e.Email).IsUnique().HasFilter("\"Email\" IS NOT NULL");
            entity.HasIndex(e => e.NationalId).IsUnique().HasFilter("\"NationalId\" IS NOT NULL");
            entity.HasIndex(e => e.HireDate);
        });

        // Payroll Period configurations
        builder.Entity<PayrollPeriod>(entity =>
        {
            entity.HasIndex(pp => new { pp.BranchId, pp.StartDate, pp.EndDate });
            entity.HasIndex(pp => new { pp.Status, pp.BranchId });
            entity.HasIndex(pp => pp.PayDate);
        });

        // Payslip configurations
        builder.Entity<Payslip>(entity =>
        {
            entity.HasOne(p => p.Employee)
                  .WithMany(e => e.Payslips)
                  .HasForeignKey(p => p.EmployeeId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(p => p.PayrollPeriod)
                  .WithMany(pp => pp.Payslips)
                  .HasForeignKey(p => p.PayrollPeriodId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(p => p.PayslipNumber).IsUnique();
            entity.HasIndex(p => new { p.EmployeeId, p.PayrollPeriodId }).IsUnique();
            entity.HasIndex(p => new { p.Status, p.PayrollPeriodId });
            entity.HasIndex(p => p.PaidDate);
        });

        // Payslip Deduction configurations
        builder.Entity<PayslipDeduction>(entity =>
        {
            entity.HasOne(pd => pd.Payslip)
                  .WithMany(p => p.PayslipDeductions)
                  .HasForeignKey(pd => pd.PayslipId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(pd => new { pd.PayslipId, pd.DeductionType });
        });

        // Salary Advance configurations
        builder.Entity<SalaryAdvance>(entity =>
        {
            entity.HasOne(sa => sa.Employee)
                  .WithMany(e => e.SalaryAdvances)
                  .HasForeignKey(sa => sa.EmployeeId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(sa => sa.AdvanceNumber).IsUnique();
            entity.HasIndex(sa => new { sa.EmployeeId, sa.Status });
            entity.HasIndex(sa => new { sa.Status, sa.RequestDate });
            entity.HasIndex(sa => sa.RequestDate);
        });

        // Salary Advance Deduction configurations
        builder.Entity<SalaryAdvanceDeduction>(entity =>
        {
            entity.HasOne(sad => sad.SalaryAdvance)
                  .WithMany(sa => sa.SalaryAdvanceDeductions)
                  .HasForeignKey(sad => sad.SalaryAdvanceId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(sad => sad.Payslip)
                  .WithMany()
                  .HasForeignKey(sad => sad.PayslipId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(sad => new { sad.SalaryAdvanceId, sad.DeductionDate });
            entity.HasIndex(sad => sad.PayslipId);
        });

        // Currency Exchange Module Configurations
        
        // Currency Exchange Rate configurations
        builder.Entity<CurrencyExchangeRate>(entity =>
        {
            entity.HasIndex(cer => new { cer.BaseCurrency, cer.TargetCurrency, cer.IsActive });
            entity.HasIndex(cer => new { cer.EffectiveDate, cer.IsActive });
            entity.HasIndex(cer => cer.UpdateMethod);
        });

        // Exchange Transaction configurations
        builder.Entity<ExchangeTransaction>(entity =>
        {
            entity.HasOne(et => et.CurrencyRate)
                  .WithMany(cer => cer.Transactions)
                  .HasForeignKey(et => et.ExchangeRateId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(et => et.TransactionNumber).IsUnique();
            entity.HasIndex(et => new { et.BranchId, et.TransactionDate });
            entity.HasIndex(et => new { et.ExchangeType, et.Status });
            entity.HasIndex(et => new { et.CustomerName, et.TransactionDate });
            entity.HasIndex(et => et.ReceiptNumber).IsUnique();
            entity.HasIndex(et => et.TransactionDate);
        });

        // Currency Reserve configurations
        builder.Entity<CurrencyReserve>(entity =>
        {
            entity.HasIndex(cr => new { cr.BranchId, cr.Currency }).IsUnique();
            entity.HasIndex(cr => new { cr.Currency, cr.IsActive });
            entity.HasIndex(cr => cr.LastRestockDate);
            entity.HasIndex(cr => cr.LastDepositDate);
        });

        // Currency Movement configurations
        builder.Entity<CurrencyMovement>(entity =>
        {
            entity.HasOne(cm => cm.CurrencyReserve)
                  .WithMany(cr => cr.CurrencyMovements)
                  .HasForeignKey(cm => cm.CurrencyReserveId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(cm => cm.ExchangeTransaction)
                  .WithMany()
                  .HasForeignKey(cm => cm.ExchangeTransactionId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(cm => new { cm.CurrencyReserveId, cm.MovementDate });
            entity.HasIndex(cm => new { cm.MovementType, cm.MovementDate });
            entity.HasIndex(cm => cm.ExchangeTransactionId);
            entity.HasIndex(cm => cm.Reference);
        });

        // Inter-Branch Transfer Module Configurations

        // InterBranchTransfer configurations
        builder.Entity<InterBranchTransfer>(entity =>
        {
            entity.HasOne(ibt => ibt.FromBranch)
                  .WithMany(b => b.SentTransfers)
                  .HasForeignKey(ibt => ibt.FromBranchId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(ibt => ibt.ToBranch)
                  .WithMany(b => b.ReceivedTransfers)
                  .HasForeignKey(ibt => ibt.ToBranchId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(ibt => ibt.TransferNumber).IsUnique();
            entity.HasIndex(ibt => new { ibt.FromBranchId, ibt.CreatedAt });
            entity.HasIndex(ibt => new { ibt.ToBranchId, ibt.CreatedAt });
            entity.HasIndex(ibt => new { ibt.Status, ibt.CreatedAt });
            entity.HasIndex(ibt => ibt.RequestedBy);
            entity.HasIndex(ibt => ibt.ApprovedBy);
            entity.HasIndex(ibt => ibt.ProcessedBy);
        });

        // InterBranchTransferLog configurations
        builder.Entity<InterBranchTransferLog>(entity =>
        {
            entity.HasOne(ibl => ibl.Transfer)
                  .WithMany(ibt => ibt.TransferLogs)
                  .HasForeignKey(ibl => ibl.TransferId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(ibl => new { ibl.TransferId, ibl.PerformedAt });
        });
    }
}