using System;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.ViewModels
{
    public enum RecouvrementPaymentType
    {
        InstallmentAndFees = 0,
        FullSettlementAndFees = 1
    }

    public partial class RecouvrementViewModel : ObservableObject
    {
        private readonly ApiService _api;

        [ObservableProperty]
        private string searchLoanNumber = string.Empty;

        [ObservableProperty]
        private MicrocreditLoan? selectedLoan;

        [ObservableProperty]
        private LoanSummary? loanSummary;

        [ObservableProperty]
        private decimal paymentAmount;

        [ObservableProperty]
        private MicrocreditPaymentMethod paymentMethod = MicrocreditPaymentMethod.Cash;

        [ObservableProperty]
        private RecouvrementPaymentType paymentType = RecouvrementPaymentType.InstallmentAndFees;

        [ObservableProperty]
        private string? paymentReference;

        [ObservableProperty]
        private string? notes;

        [ObservableProperty]
        private bool isBusy;

        [ObservableProperty]
        private string statusMessage = string.Empty;

        [ObservableProperty]
        private decimal monthlyPaymentNoFee;

        [ObservableProperty]
        private decimal monthlyPaymentWithFee;

        [ObservableProperty]
        private decimal remainingWithFees;

        [ObservableProperty]
        private decimal processingFeeMonthly;

        [ObservableProperty]
        private decimal totalDueNoFee;

        [ObservableProperty]
        private decimal totalDueWithFees;

        [ObservableProperty]
        private decimal monthlyRatePercentDisplay;

        [ObservableProperty]
        private int durationMonthsDisplay;

        [ObservableProperty]
        private decimal approvedAmountDisplay;

        [ObservableProperty]
        private bool isRecordPaymentEnabled = true;

        public ObservableCollection<OverdueLoan> OverdueLoans { get; } = new();

        public RecouvrementViewModel(ApiService api)
        {
            _api = api ?? throw new ArgumentNullException(nameof(api));
        }

        partial void OnPaymentTypeChanged(RecouvrementPaymentType value)
        {
            ApplyPaymentSuggestion();
        }

        partial void OnLoanSummaryChanged(LoanSummary? value)
        {
            ComputeFeeInclusiveMetrics();
            ApplyPaymentSuggestion();
        }

        private void ApplyPaymentSuggestion()
        {
            if (LoanSummary == null) return;
            try
            {
                switch (PaymentType)
                {
                    case RecouvrementPaymentType.InstallmentAndFees:
                        PaymentAmount = Math.Round(MonthlyPaymentWithFee, 2);
                        break;
                    case RecouvrementPaymentType.FullSettlementAndFees:
                        PaymentAmount = Math.Round(RemainingWithFees, 2);
                        break;
                }
            }
            catch
            {
                // ignore suggestion errors; user can input manually
            }
        }

        private void ComputeFeeInclusiveMetrics()
        {
            if (SelectedLoan == null || LoanSummary == null)
            {
                MonthlyPaymentNoFee = 0;
                MonthlyPaymentWithFee = 0;
                RemainingWithFees = 0;
                return;
            }

            var principal = SelectedLoan.ApprovedAmount > 0 ? SelectedLoan.ApprovedAmount : SelectedLoan.PrincipalAmount;
            var months = SelectedLoan.DurationMonths > 0 ? SelectedLoan.DurationMonths : 12;
            // Align monthly rate resolution with web (superadmin) logic:
            // - If monthlyInterestRate is provided (can be fraction like 0.035 or percent like 3.5), normalize to percent
            // - Else if only annual InterestRate is provided, convert to monthly by dividing by 12
            // - Else fall back to 3.5% monthly
            decimal NormalizePercent(decimal v)
            {
                if (v <= 0) return 0m;
                return v < 1m ? v * 100m : v; // 0.035 -> 3.5
            }

            var monthlyRatePercent = 0m;
            if (SelectedLoan.MonthlyInterestRate.HasValue && SelectedLoan.MonthlyInterestRate.Value > 0)
            {
                monthlyRatePercent = NormalizePercent(SelectedLoan.MonthlyInterestRate.Value);
            }
            else if (SelectedLoan.InterestRate > 0)
            {
                var annualPercent = NormalizePercent(SelectedLoan.InterestRate);
                monthlyRatePercent = annualPercent / 12m;
            }
            else
            {
                monthlyRatePercent = 3.5m;
            }
            var r = monthlyRatePercent / 100m;

            decimal effectiveMonthly;
            if (r <= 0 || months <= 0)
            {
                effectiveMonthly = months > 0 ? Math.Round(principal / months, 2) : principal;
            }
            else
            {
                var numerator = principal * r;
                var denom = 1m - (decimal)Math.Pow(1 + (double)r, -months);
                effectiveMonthly = denom != 0 ? Math.Round(numerator / denom, 2) : 0m;
            }

            MonthlyPaymentNoFee = effectiveMonthly;

            var processingFee = Math.Round(principal * 0.05m, 2);
            var distributedFeePortion = months > 0 ? Math.Round(processingFee / months, 2) : 0m;
            MonthlyPaymentWithFee = Math.Round(effectiveMonthly + distributedFeePortion, 2);

            var totalDueWithFeesCalc = Math.Round(MonthlyPaymentWithFee * months, 2);
            var totalPaid = LoanSummary.TotalPaid;
            RemainingWithFees = Math.Max(0m, Math.Round(totalDueWithFeesCalc - totalPaid, 2));

            // Set detail display fields
            processingFeeMonthly = distributedFeePortion;
            totalDueNoFee = Math.Round(MonthlyPaymentNoFee * months, 2);
            totalDueWithFees = totalDueWithFeesCalc;
            monthlyRatePercentDisplay = monthlyRatePercent;
            durationMonthsDisplay = months;
            approvedAmountDisplay = principal;
        }

        [RelayCommand]
        private async Task LoadOverdueAsync()
        {
            try
            {
                IsBusy = true;
                StatusMessage = "Chargement des prêts en retard...";
                OverdueLoans.Clear();
                var list = await _api.GetOverdueLoansAsync(1);
                foreach (var item in list)
                {
                    OverdueLoans.Add(item);
                }
                StatusMessage = OverdueLoans.Count == 0 ? "Aucun prêt en retard" : $"{OverdueLoans.Count} prêts en retard";
            }
            catch (Exception ex)
            {
                StatusMessage = ex.Message;
            }
            finally
            {
                IsBusy = false;
            }
        }

        [RelayCommand]
        private async Task SearchLoanAsync()
        {
            if (string.IsNullOrWhiteSpace(SearchLoanNumber))
            {
                StatusMessage = "Saisissez le numéro du prêt";
                return;
            }
            try
            {
                IsBusy = true;
                StatusMessage = "Recherche du prêt...";
                SelectedLoan = await _api.SearchLoanByNumberAsync(SearchLoanNumber.Trim());
                if (SelectedLoan == null)
                {
                    StatusMessage = "Prêt introuvable";
                    LoanSummary = null;
                    return;
                }
                LoanSummary = await _api.GetLoanSummaryAsync(SelectedLoan.Id);
                StatusMessage = "Prêt chargé";
                IsRecordPaymentEnabled = true;
            }
            catch (Exception ex)
            {
                StatusMessage = ex.Message;
            }
            finally
            {
                IsBusy = false;
            }
        }

        [RelayCommand]
        private async Task RecordPaymentAsync()
        {
            if (SelectedLoan == null)
            {
                StatusMessage = "Sélectionnez un prêt";
                return;
            }
            if (PaymentAmount <= 0)
            {
                StatusMessage = "Saisissez un montant valide";
                return;
            }

            try
            {
                IsBusy = true;
                StatusMessage = "Enregistrement du paiement...";
                var req = new CreateMicrocreditPaymentRequest
                {
                    LoanId = SelectedLoan.Id,
                    Amount = PaymentAmount,
                    PaymentDate = DateTime.Now,
                    PaymentMethod = PaymentMethod,
                    Reference = PaymentReference,
                    Notes = Notes
                };

                var payment = await _api.RecordPaymentAsync(req);
                if (payment == null)
                {
                    StatusMessage = "Échec de l’enregistrement du paiement";
                    return;
                }

                // Confirm immediately for cashier workflow
                try
                {
                    var confirmed = await _api.ConfirmPaymentAsync(payment.Id);
                    if (confirmed == null)
                    {
                        StatusMessage = "Paiement enregistré, mais la confirmation a échoué";
                        return;
                    }

                    // Refresh summary to reflect new balances
                    LoanSummary = await _api.GetLoanSummaryAsync(SelectedLoan.Id);
                    StatusMessage = $"Paiement confirmé. Reçu : {confirmed.ReceiptNumber}";
                    AppServices.RaiseTransactionProcessed();
                    IsRecordPaymentEnabled = false;
                }
                catch (Exception ex)
                {
                    StatusMessage = $"Paiement enregistré, mais la confirmation a échoué: {ex.Message}";
                    return;
                }

            }
            catch (Exception ex)
            {
                StatusMessage = ex.Message;
            }
            finally
            {
                IsBusy = false;
            }
        }
    }
}
