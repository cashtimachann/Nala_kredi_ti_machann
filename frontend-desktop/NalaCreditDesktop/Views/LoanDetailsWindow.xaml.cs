using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class LoanDetailsWindow : Window
    {
        private readonly ApiService _apiService;
        private readonly Guid _loanId;
        private MicrocreditLoan? _loan;

        public LoanDetailsWindow(ApiService apiService, Guid loanId)
        {
            InitializeComponent();
            _apiService = apiService ?? throw new ArgumentNullException(nameof(apiService));
            _loanId = loanId;
            
            _ = LoadLoanDetailsAsync();
        }

        private async System.Threading.Tasks.Task LoadLoanDetailsAsync()
        {
            try
            {
                // Fetch loan details from API
                _loan = await _apiService.GetLoanByIdAsync(_loanId);

                if (_loan == null)
                {
                    MessageBox.Show("Impossible de charger les détails du prêt.",
                        "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                    Close();
                    return;
                }

                PopulateLoanDetails();
                await LoadPaymentScheduleAsync();
                await LoadPaymentHistoryAsync();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors du chargement des détails:\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                Close();
            }
        }

        private async System.Threading.Tasks.Task LoadPaymentScheduleAsync()
        {
            try
            {
                var schedule = await _apiService.GetPaymentScheduleAsync(_loanId);
                if (schedule != null && schedule.Any())
                {
                    var scheduleItems = new List<ScheduleItem>();
                    decimal cumulativeBalance = schedule.Sum(s => (s.PrincipalAmount ?? 0) + (s.InterestAmount ?? 0) + (s.FeePortion ?? 0));
                    
                    foreach (var item in schedule)
                    {
                        var principal = item.PrincipalAmount ?? 0;
                        var interest = item.InterestAmount ?? 0;
                        var fee = item.FeePortion ?? 0;
                        var total = item.TotalPayment ?? (principal + interest);
                        var totalWithFee = item.TotalAmountWithFee ?? (total + fee);
                        
                        cumulativeBalance -= totalWithFee;
                        
                        scheduleItems.Add(new ScheduleItem
                        {
                            InstallmentNumber = item.InstallmentNumber,
                            DueDateFormatted = item.DueDate.ToString("dd/MM/yyyy"),
                            PrincipalFormatted = $"{principal:N2} {_loan?.Currency ?? "HTG"}",
                            InterestFormatted = $"{interest:N2} {_loan?.Currency ?? "HTG"}",
                            FeeFormatted = $"{fee:N2} {_loan?.Currency ?? "HTG"}",
                            TotalFormatted = $"{total:N2} {_loan?.Currency ?? "HTG"}",
                            TotalWithFeeFormatted = $"{totalWithFee:N2} {_loan?.Currency ?? "HTG"}",
                            BalanceFormatted = $"{Math.Max(0, cumulativeBalance):N2} {_loan?.Currency ?? "HTG"}",
                            Status = item.Status?.ToUpper() ?? "UPCOMING",
                            StatusText = GetScheduleStatusText(item.Status?.ToUpper() ?? "UPCOMING")
                        });
                    }
                    
                    ScheduleDataGrid.ItemsSource = scheduleItems;
                }
            }
            catch (Exception ex)
            {
                // Silent fail - schedule is optional
                System.Diagnostics.Debug.WriteLine($"Error loading payment schedule: {ex.Message}");
            }
        }

        private async System.Threading.Tasks.Task LoadPaymentHistoryAsync()
        {
            try
            {
                var payments = await _apiService.GetLoanPaymentsAsync(_loanId);
                if (payments != null && payments.Any())
                {
                    var historyItems = payments.Select(p => new PaymentHistoryItem
                    {
                        PaymentDateFormatted = p.PaymentDate.ToString("dd MMMM yyyy", new CultureInfo("fr-FR")),
                        ReceiptDisplay = $"Reçu: {p.ReceiptNumber}",
                        AmountFormatted = $"{p.Amount:N2} {p.Currency}",
                        PrincipalFormatted = $"{p.PrincipalAmount:N2} {p.Currency}",
                        InterestFormatted = $"{p.InterestAmount:N2} {p.Currency}",
                        PaymentMethod = GetPaymentMethodLabel(p.PaymentMethod),
                        ReceivedBy = p.ProcessedByName ?? "N/A"
                    }).ToList();
                    
                    PaymentHistoryItemsControl.ItemsSource = historyItems;
                }
            }
            catch (Exception ex)
            {
                // Silent fail - history is optional
                System.Diagnostics.Debug.WriteLine($"Error loading payment history: {ex.Message}");
            }
        }

        private string GetScheduleStatusText(string status)
        {
            return status switch
            {
                "PAID" => "Payé",
                "PENDING" => "En cours",
                "OVERDUE" => "En retard",
                "UPCOMING" => "À venir",
                _ => status
            };
        }

        private string GetPaymentMethodLabel(string method)
        {
            return method?.ToLower() switch
            {
                "cash" => "Espèces",
                "check" => "Chèque",
                "banktransfer" => "Virement",
                "mobilemoney" => "Mobile Money",
                _ => method ?? "N/A"
            };
        }

        private void PopulateLoanDetails()
        {
            if (_loan == null) return;

            // Header
            LoanNumberText.Text = $"Numéro: {_loan.LoanNumber}";
            
            // Status
            SetStatusBadge(_loan.Status ?? "Unknown");

            // Client Information
            var clientName = !string.IsNullOrWhiteSpace(_loan.Borrower?.FullName)
                ? _loan.Borrower.FullName
                : !string.IsNullOrWhiteSpace(_loan.BorrowerName)
                    ? _loan.BorrowerName
                    : $"{_loan.Borrower?.FirstName} {_loan.Borrower?.LastName}".Trim();
            
            ClientNameText.Text = string.IsNullOrWhiteSpace(clientName) ? "N/A" : clientName;
            
            // Customer Code / Account Number
            var customerCode = _loan.Borrower?.CustomerNumber ?? _loan.Borrower?.CustomerId.ToString() ?? "N/A";
            CustomerCodeText.Text = customerCode;
            
            var phone = _loan.Borrower?.Phone ?? _loan.BorrowerPhone ?? "N/A";
            ClientPhoneText.Text = phone;
            
            // Email
            var email = _loan.Borrower?.Email ?? "N/A";
            ClientEmailText.Text = email;
            
            // Address
            var address = _loan.Borrower?.Address ?? "N/A";
            ClientAddressText.Text = address;
            
            // Occupation
            var occupation = _loan.Borrower?.Occupation ?? "N/A";
            OccupationText.Text = occupation;
            
            LoanOfficerText.Text = string.IsNullOrWhiteSpace(_loan.LoanOfficerName) 
                ? "N/A" 
                : _loan.LoanOfficerName;
            
            BranchText.Text = string.IsNullOrWhiteSpace(_loan.BranchName) 
                ? "N/A" 
                : _loan.BranchName;

            // Loan Information
            LoanTypeText.Text = GetLoanTypeDisplay(_loan.LoanType);
            
            // Requested Amount
            var requestedAmount = _loan.RequestedAmount > 0 ? _loan.RequestedAmount : _loan.ApprovedAmount;
            RequestedAmountText.Text = $"{requestedAmount:N2} {_loan.Currency}";
            
            ApprovedAmountText.Text = $"{_loan.ApprovedAmount:N2} {_loan.Currency}";
            
            // Calculate difference between requested and approved
            if (_loan.RequestedAmount > 0 && _loan.RequestedAmount != _loan.ApprovedAmount)
            {
                var difference = ((_loan.ApprovedAmount - _loan.RequestedAmount) / _loan.RequestedAmount) * 100;
                ApprovalDifferenceText.Text = $"{difference:F1}%";
            }
            else
            {
                ApprovalDifferenceText.Text = "N/A";
            }
            
            PrincipalAmountText.Text = $"{_loan.PrincipalAmount:N2} {_loan.Currency}";
            
            // Calculate processing fee (5% of principal)
            var processingFee = _loan.PrincipalAmount * 0.05m;
            ProcessingFeeText.Text = $"{processingFee:N2} {_loan.Currency}";

            // Duration and rates
            var termMonths = _loan.TermMonths > 0 ? _loan.TermMonths : _loan.DurationMonths;
            DurationText.Text = $"{termMonths} mois";

            var monthlyRate = _loan.MonthlyInterestRate.HasValue && _loan.MonthlyInterestRate.Value > 0
                ? _loan.MonthlyInterestRate.Value
                : (_loan.InterestRate / 12);
            var monthlyRatePercent = monthlyRate * 100;
            InterestRateText.Text = $"{monthlyRatePercent:F2}%";
            
            // Annual rate
            var annualRate = monthlyRatePercent * 12;
            AnnualRateText.Text = $"{annualRate:F2}%";

            // Monthly payments
            var monthlyPayment = _loan.MonthlyPayment > 0 ? _loan.MonthlyPayment : _loan.InstallmentAmount;
            MonthlyPaymentText.Text = $"{monthlyPayment:N2} {_loan.Currency}";
            
            var monthlyFeePortion = processingFee / termMonths;
            var monthlyPaymentWithFees = monthlyPayment + monthlyFeePortion;
            MonthlyPaymentWithFeesText.Text = $"{monthlyPaymentWithFees:N2} {_loan.Currency}";
            
            // Calculate total interest and total repayment
            var totalInterest = (monthlyPayment * termMonths) - _loan.PrincipalAmount;
            TotalInterestText.Text = $"{totalInterest:N2} {_loan.Currency}";
            
            var totalRepayment = (monthlyPaymentWithFees * termMonths);
            TotalRepaymentText.Text = $"{totalRepayment:N2} {_loan.Currency}";

            // Payment Status
            var paymentsMade = _loan.PaymentsMade > 0 ? _loan.PaymentsMade : _loan.InstallmentsPaid;
            PaymentsMadeText.Text = $"{paymentsMade} / {termMonths} versements";
            
            AmountPaidText.Text = $"{_loan.AmountPaid:N2} {_loan.Currency}";
            
            // Interest Paid
            var interestPaid = _loan.InterestPaid > 0 ? _loan.InterestPaid : 0;
            InterestPaidText.Text = $"{interestPaid:N2} {_loan.Currency}";
            
            // Next payment date - show message if completed or show the date
            if (paymentsMade >= termMonths)
            {
                NextPaymentDateText.Text = "Prêt complété";
            }
            else if (_loan.NextPaymentDate.HasValue)
            {
                NextPaymentDateText.Text = _loan.NextPaymentDate.Value.ToString("dd MMMM yyyy");
            }
            else
            {
                NextPaymentDateText.Text = "Date non disponible";
            }

            // Outstanding balances
            var outstandingBalance = _loan.RemainingBalance > 0 ? _loan.RemainingBalance : _loan.OutstandingBalance;
            
            // Calculate remaining processing fees
            var installmentsRemaining = termMonths - paymentsMade;
            var remainingProcessingFees = (processingFee * installmentsRemaining) / termMonths;
            var totalRemainingBalance = outstandingBalance + remainingProcessingFees;
            
            RemainingBalanceText.Text = $"{totalRemainingBalance:N2} {_loan.Currency}";
            OutstandingPrincipalText.Text = $"{_loan.OutstandingPrincipal:N2} {_loan.Currency}";
            OutstandingInterestText.Text = $"{_loan.OutstandingInterest:N2} {_loan.Currency}";

            // Overdue information
            if (_loan.DaysOverdue > 0)
            {
                OverduePanel.Visibility = Visibility.Visible;
                OverdueText.Text = $"Ce prêt est en retard de {_loan.DaysOverdue} jour(s). " +
                    $"Le prochain paiement de {monthlyPaymentWithFees:N2} {_loan.Currency} devait être effectué avant le {_loan.NextPaymentDate?.ToString("dd/MM/yyyy") ?? "N/A"}.";
            }
            else
            {
                OverduePanel.Visibility = Visibility.Collapsed;
            }
            
            // Important Dates
            ApplicationDateText.Text = _loan.CreatedAt != DateTime.MinValue 
                ? _loan.CreatedAt.ToString("dd MMMM yyyy") 
                : "N/A";
            
            if (_loan.ApprovedAt.HasValue && _loan.ApprovedAt.Value != DateTime.MinValue)
            {
                ApprovalDateText.Text = _loan.ApprovedAt.Value.ToString("dd MMMM yyyy");
                
                // Show who approved if available
                var approvedByName = _loan.ApprovedByName ?? _loan.ApprovedBy;
                if (!string.IsNullOrWhiteSpace(approvedByName))
                {
                    ApprovedByText.Text = $"Par: {approvedByName}";
                }
                else
                {
                    ApprovedByText.Text = string.Empty;
                }
            }
            else
            {
                ApprovalDateText.Text = "N/A";
                ApprovedByText.Text = string.Empty;
            }
            
            if (_loan.DisbursementDate.HasValue)
            {
                DisbursementDateText.Text = _loan.DisbursementDate.Value.ToString("dd MMMM yyyy");
            }
            else
            {
                DisbursementDateText.Text = "N/A";
            }
            
            if (_loan.MaturityDate.HasValue)
            {
                MaturityDateText.Text = _loan.MaturityDate.Value.ToString("dd MMMM yyyy");
            }
            else
            {
                MaturityDateText.Text = "N/A";
            }

            // Progress bar
            var progressPercentage = termMonths > 0 ? (double)paymentsMade / termMonths * 100 : 0;
            PaymentProgressBar.Value = progressPercentage;
            ProgressPercentageText.Text = $"{progressPercentage:F1}% complété";
            ProgressFractionText.Text = $"{paymentsMade} sur {termMonths} versements";
        }

        private void SetStatusBadge(string status)
        {
            StatusText.Text = GetStatusDisplay(status);
            
            switch (status?.ToLower())
            {
                case "active":
                    StatusBadge.Background = new SolidColorBrush(Color.FromRgb(39, 174, 96)); // Green
                    break;
                case "overdue":
                    StatusBadge.Background = new SolidColorBrush(Color.FromRgb(230, 126, 34)); // Orange
                    break;
                case "defaulted":
                    StatusBadge.Background = new SolidColorBrush(Color.FromRgb(231, 76, 60)); // Red
                    break;
                case "completed":
                case "closed":
                    StatusBadge.Background = new SolidColorBrush(Color.FromRgb(52, 152, 219)); // Blue
                    break;
                default:
                    StatusBadge.Background = new SolidColorBrush(Color.FromRgb(149, 165, 166)); // Gray
                    break;
            }
        }

        private string GetStatusDisplay(string? status)
        {
            return status?.ToLower() switch
            {
                "active" => "À Jour",
                "overdue" => "En Retard",
                "defaulted" => "Défaillant",
                "completed" => "Complété",
                "closed" => "Fermé",
                "pending" => "En Attente",
                "approved" => "Approuvé",
                "rejected" => "Rejeté",
                "disbursed" => "Décaissé",
                _ => status ?? "Inconnu"
            };
        }

        private string GetLoanTypeDisplay(string? loanType)
        {
            return loanType?.ToLower() switch
            {
                "personal" => "Personnel",
                "business" => "Affaires",
                "agriculture" => "Agricole",
                "education" => "Éducation",
                "housing" => "Logement",
                "creditauto" => "Crédit Auto",
                "creditmoto" => "Crédit Moto",
                "equipment" => "Équipement",
                "workingcapital" => "Fonds de Roulement",
                _ => loanType ?? "Non spécifié"
            };
        }

        private void Close_Click(object sender, RoutedEventArgs e)
        {
            Close();
        }
    }

    // Helper classes for data binding
    public class ScheduleItem
    {
        public int InstallmentNumber { get; set; }
        public string DueDateFormatted { get; set; } = string.Empty;
        public string PrincipalFormatted { get; set; } = string.Empty;
        public string InterestFormatted { get; set; } = string.Empty;
        public string FeeFormatted { get; set; } = string.Empty;
        public string TotalFormatted { get; set; } = string.Empty;
        public string TotalWithFeeFormatted { get; set; } = string.Empty;
        public string BalanceFormatted { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string StatusText { get; set; } = string.Empty;
    }

    public class PaymentHistoryItem
    {
        public string PaymentDateFormatted { get; set; } = string.Empty;
        public string ReceiptDisplay { get; set; } = string.Empty;
        public string AmountFormatted { get; set; } = string.Empty;
        public string PrincipalFormatted { get; set; } = string.Empty;
        public string InterestFormatted { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = string.Empty;
        public string ReceivedBy { get; set; } = string.Empty;
    }
}
