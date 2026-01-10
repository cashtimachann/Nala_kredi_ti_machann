using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;
using CreditAgentDashboardDto = NalaCreditDesktop.Services.CreditAgentDashboard;

namespace NalaCreditDesktop.ViewModels
{
    public partial class CreditAgentDashboardViewModel : ObservableObject
    {
        private readonly ApiService _apiService;

        public CreditAgentDashboardViewModel(ApiService apiService)
        {
            _apiService = apiService;
        }

        [ObservableProperty]
        private bool isLoading;

        [ObservableProperty]
        private string errorMessage = string.Empty;

        [ObservableProperty]
        private string connectionStatus = "Déconnecté";

        [ObservableProperty]
        private int pendingApplicationsCount;

        [ObservableProperty]
        private int activeLoansCount;

        [ObservableProperty]
        private int overdueLoansCount;

        [ObservableProperty]
        private double repaymentRate;

        [ObservableProperty]
        private decimal totalPortfolioAmount;

        [ObservableProperty]
        private int approvedThisMonthCount;

        [ObservableProperty]
        private int approvalRatePercent;

        [ObservableProperty]
        private decimal averageLoanAmount;

        [ObservableProperty]
        private decimal paymentsThisWeekAmount;

        [ObservableProperty]
        private DateTime lastUpdated = DateTime.Now;

        [ObservableProperty]
        private ObservableCollection<RecentApplicationItem> recentApplications = new();

        [ObservableProperty]
        private ObservableCollection<PaymentDueItem> upcomingPayments = new();

        [ObservableProperty]
        private ObservableCollection<OverdueLoanItem> overdueLoans = new();

        [ObservableProperty]
        private ObservableCollection<ActivityItem> recentActivities = new();

        [ObservableProperty]
        private ObservableCollection<BranchLoanItem> branchLoans = new();

        public async Task LoadAsync()
        {
            try
            {
                IsLoading = true;
                ErrorMessage = string.Empty;
                ConnectionStatus = "Chargement...";

                var dashboardResult = await _apiService.GetCreditAgentDashboardResultAsync();

                if (dashboardResult?.IsSuccess == true && dashboardResult.Data != null)
                {
                    MapSummary(dashboardResult.Data);
                    MapUpcomingPayments(dashboardResult.Data);
                }
                else
                {
                    ErrorMessage = dashboardResult?.ErrorMessage ?? "Impossible de charger le tableau de bord.";
                }

                await LoadBranchLoansAsync();

                ConnectionStatus = "Connecté";
                LastUpdated = DateTime.Now;
            }
            catch (Exception ex)
            {
                ErrorMessage = ex.Message;
                ConnectionStatus = "Erreur";
            }
            finally
            {
                IsLoading = false;
            }
        }

        private void MapSummary(CreditAgentDashboardDto dto)
        {
            PendingApplicationsCount = dto.PendingApplications;
            ActiveLoansCount = dto.ActiveCreditsCount;
            OverdueLoansCount = dto.OverdueCredits;
            RepaymentRate = dto.RepaymentRate;
            TotalPortfolioAmount = dto.TotalPortfolioAmount;
            PaymentsThisWeekAmount = dto.PaymentsDueList?.Sum(p => p.Amount) ?? 0m;

            // Placeholders until backend provides these fields for credit agents
            ApprovedThisMonthCount = dto.ActiveCreditsCount;
            ApprovalRatePercent = dto.PendingApplications + dto.ActiveCreditsCount == 0
                ? 0
                : (int)Math.Round(100.0 * dto.ActiveCreditsCount / Math.Max(1, dto.PendingApplications + dto.ActiveCreditsCount));
            AverageLoanAmount = dto.ActiveCreditsCount == 0 ? 0 : dto.TotalPortfolioAmount / Math.Max(1, dto.ActiveCreditsCount);
        }

        private void MapUpcomingPayments(CreditAgentDashboardDto dto)
        {
            UpcomingPayments.Clear();
            if (dto.PaymentsDueList == null || dto.PaymentsDueList.Count == 0)
            {
                return;
            }

            foreach (var item in dto.PaymentsDueList.OrderBy(p => p.DueDate))
            {
                UpcomingPayments.Add(item);
            }
        }

        private async Task LoadBranchLoansAsync()
        {
            BranchLoans.Clear();

            var branchId = _apiService.CurrentUser?.BranchId;
            var loansResponse = await _apiService.GetLoansAsync(page: 1, pageSize: 200, status: null, branchId: branchId, isOverdue: null);

            if (loansResponse?.Loans == null)
            {
                return;
            }

            foreach (var loan in loansResponse.Loans.OrderByDescending(l => l.CreatedAt))
            {
                BranchLoans.Add(new BranchLoanItem
                {
                    LoanNumber = loan.LoanNumber,
                    Borrower = string.IsNullOrWhiteSpace(loan.BorrowerName)
                        ? loan.Borrower?.FullName ?? "N/A"
                        : loan.BorrowerName,
                    ApprovedAmount = loan.ApprovedAmount,
                    OutstandingBalance = loan.OutstandingBalance,
                    Status = loan.Status ?? "N/A",
                    LoanOfficer = string.IsNullOrWhiteSpace(loan.LoanOfficerName) ? "N/A" : loan.LoanOfficerName,
                    NextPaymentDate = loan.NextPaymentDate,
                    Currency = loan.Currency,
                    BranchName = loan.BranchName
                });
            }
        }

        public class RecentApplicationItem
        {
            public string ApplicationNumber { get; set; } = string.Empty;
            public string BorrowerName { get; set; } = string.Empty;
            public decimal Amount { get; set; }
            public string Status { get; set; } = string.Empty;
            public DateTime CreatedAt { get; set; }
        }

        public class OverdueLoanItem
        {
            public string LoanNumber { get; set; } = string.Empty;
            public string BorrowerName { get; set; } = string.Empty;
            public decimal OutstandingAmount { get; set; }
            public int DaysOverdue { get; set; }
        }

        public class ActivityItem
        {
            public string Description { get; set; } = string.Empty;
            public DateTime Timestamp { get; set; }
        }

        public class BranchLoanItem
        {
            public string LoanNumber { get; set; } = string.Empty;
            public string Borrower { get; set; } = string.Empty;
            public decimal ApprovedAmount { get; set; }
            public decimal OutstandingBalance { get; set; }
            public string Status { get; set; } = string.Empty;
            public string LoanOfficer { get; set; } = string.Empty;
            public DateTime? NextPaymentDate { get; set; }
            public string Currency { get; set; } = "HTG";
            public string BranchName { get; set; } = string.Empty;
        }
    }
}
