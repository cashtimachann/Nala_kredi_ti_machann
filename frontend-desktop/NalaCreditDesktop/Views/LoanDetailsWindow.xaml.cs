using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class LoanDetailsWindow : Window
    {
        private readonly ApiService _apiService;
        private readonly Guid _loanId;
        private MicrocreditLoan? _loan;
        private MicrocreditLoanApplicationDto? _application;

        public LoanDetailsWindow(ApiService apiService, Guid loanId)
        {
            InitializeComponent();
            _apiService = apiService ?? throw new ArgumentNullException(nameof(apiService));
            _loanId = loanId;
        }

        private async void Window_Loaded(object sender, RoutedEventArgs e)
        {
            await LoadLoanDetailsAsync();
        }

        private async System.Threading.Tasks.Task LoadLoanDetailsAsync()
        {
            try
            {
                LoadingText.Visibility = Visibility.Visible;
                ContentPanel.Visibility = Visibility.Collapsed;

                // Load loan details
                _loan = await _apiService.GetLoanByIdAsync(_loanId);
                if (_loan == null)
                {
                    MessageBox.Show("Impossible de charger les détails du crédit.", "Erreur", 
                        MessageBoxButton.OK, MessageBoxImage.Error);
                    Close();
                    return;
                }

                // Load payment schedule
                var schedule = await _apiService.GetPaymentScheduleAsync(_loanId);
                
                // Load payment history
                var payments = await _apiService.GetLoanPaymentsAsync(_loanId);

                // Load application snapshot (for phone/email/address/savings account)
                if (_loan.ApplicationId != Guid.Empty)
                {
                    var appResult = await _apiService.GetMicrocreditApplicationAsync(_loan.ApplicationId);
                    if (appResult.IsSuccess)
                    {
                        _application = appResult.Data;
                    }
                }

                // Update UI
                UpdateLoanDetails(_loan);
                UpdatePaymentSchedule(schedule);
                UpdatePaymentHistory(payments);

                LoadingText.Visibility = Visibility.Collapsed;
                ContentPanel.Visibility = Visibility.Visible;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors du chargement des détails:\n\n{ex.Message}", 
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                Close();
            }
        }

        private void UpdateLoanDetails(MicrocreditLoan loan)
        {
            // Header
            LoanNumberText.Text = $"Prêt N° {loan.LoanNumber}";

            // Summary Cards
            var monthlyRate = loan.MonthlyInterestRate ?? (loan.InterestRate / 12);
            var termMonths = loan.DurationMonths;
            var principal = loan.PrincipalAmount;
            
            // Calculate monthly payment with fee
            var monthlyPayment = CalculateMonthlyPayment(principal, monthlyRate, termMonths);
            var processingFee = principal * 0.05m;
            var feePortion = termMonths > 0 ? processingFee / termMonths : 0;
            var monthlyPaymentWithFee = monthlyPayment + feePortion;
            
            // Calculate totals
            var totalDue = monthlyPaymentWithFee * termMonths;
            var paidAmount = loan.PaidAmount ?? loan.AmountPaid;
            var remaining = Math.Max(0, totalDue - paidAmount);

            PrincipalText.Text = $"{principal:N2} {loan.Currency}";
            TotalPaidText.Text = $"{paidAmount:N2} {loan.Currency}";
            RemainingText.Text = $"{remaining:N2} {loan.Currency}";

            // Next payment
            if (loan.NextPaymentDate.HasValue)
            {
                NextPaymentText.Text = $"{loan.NextPaymentDate.Value:dd/MM/yyyy}\n{monthlyPaymentWithFee:N2} {loan.Currency}";
            }
            else if (loan.FirstInstallmentDate.HasValue && paidAmount > 0 && monthlyPaymentWithFee > 0)
            {
                var installmentsPaid = (int)Math.Floor(paidAmount / monthlyPaymentWithFee);
                if (installmentsPaid < termMonths)
                {
                    var nextDate = loan.FirstInstallmentDate.Value.AddMonths(installmentsPaid);
                    NextPaymentText.Text = $"{nextDate:dd/MM/yyyy}\n{monthlyPaymentWithFee:N2} {loan.Currency}";
                }
                else
                {
                    NextPaymentText.Text = "Prêt complété";
                }
            }
            else
            {
                NextPaymentText.Text = "Non disponible";
            }

            // Borrower Information
            if (loan.Borrower != null)
            {
                BorrowerNameText.Text = !string.IsNullOrWhiteSpace(loan.Borrower.FullName)
                    ? loan.Borrower.FullName
                    : $"{loan.Borrower.FirstName} {loan.Borrower.LastName}".Trim();

                // Robust phone fallback: Borrower.Phone -> Contact.PrimaryPhone -> Contact.SecondaryPhone -> loan.BorrowerPhone -> Application.CustomerPhone
                string? phone = null;
                if (!string.IsNullOrWhiteSpace(loan.Borrower.Phone)) phone = loan.Borrower.Phone;
                else if (!string.IsNullOrWhiteSpace(loan.Borrower.Contact?.PrimaryPhone)) phone = loan.Borrower.Contact!.PrimaryPhone;
                else if (!string.IsNullOrWhiteSpace(loan.Borrower.Contact?.SecondaryPhone)) phone = loan.Borrower.Contact!.SecondaryPhone;
                else if (!string.IsNullOrWhiteSpace(loan.BorrowerPhone)) phone = loan.BorrowerPhone;
                else if (!string.IsNullOrWhiteSpace(_application?.CustomerPhone)) phone = _application!.CustomerPhone!;
                BorrowerPhoneText.Text = string.IsNullOrWhiteSpace(phone) ? "N/A" : phone;

                // Savings account: prefer application snapshot, fallback to borrower account
                string? savingsAccount = _application?.SavingsAccountNumber;
                if (string.IsNullOrWhiteSpace(savingsAccount)) savingsAccount = loan.Borrower.AccountNumber;
                BorrowerAccountText.Text = string.IsNullOrWhiteSpace(savingsAccount) ? "N/A" : savingsAccount;

                // Friendly address formatting: prefer preformatted string, else compose from AddressObject parts
                string? addressDisplay = null;
                if (!string.IsNullOrWhiteSpace(loan.Borrower.Address))
                {
                    addressDisplay = loan.Borrower.Address;
                }
                else if (loan.Borrower.AddressObject != null)
                {
                    var addr = loan.Borrower.AddressObject;
                    var parts = new List<string>();
                    if (!string.IsNullOrWhiteSpace(addr.Street)) parts.Add(addr.Street);
                    if (!string.IsNullOrWhiteSpace(addr.City)) parts.Add(addr.City);
                    if (!string.IsNullOrWhiteSpace(addr.State)) parts.Add(addr.State);
                    if (!string.IsNullOrWhiteSpace(addr.PostalCode)) parts.Add(addr.PostalCode);
                    if (!string.IsNullOrWhiteSpace(addr.Country)) parts.Add(addr.Country);
                    addressDisplay = parts.Count > 0 ? string.Join(", ", parts) : null;
                }
                // Email from contact, fallback to application
                string? email = loan.Borrower.Contact?.Email ?? _application?.CustomerEmail;
                BorrowerEmailText.Text = string.IsNullOrWhiteSpace(email) ? "N/A" : email;

                BorrowerAddressText.Text = string.IsNullOrWhiteSpace(addressDisplay) ? (string.IsNullOrWhiteSpace(_application?.CustomerAddress) ? "N/A" : _application!.CustomerAddress!) : addressDisplay;

                BorrowerOccupationText.Text = string.IsNullOrWhiteSpace(loan.Borrower.Occupation) ? "N/A" : loan.Borrower.Occupation;
            }
            else
            {
                // Use application snapshot where borrower is missing
                BorrowerNameText.Text = !string.IsNullOrWhiteSpace(_application?.CustomerName) ? _application!.CustomerName! : (string.IsNullOrWhiteSpace(loan.BorrowerName) ? "N/A" : loan.BorrowerName);
                BorrowerPhoneText.Text = !string.IsNullOrWhiteSpace(_application?.CustomerPhone) ? _application!.CustomerPhone! : (string.IsNullOrWhiteSpace(loan.BorrowerPhone) ? "N/A" : loan.BorrowerPhone);
                BorrowerEmailText.Text = !string.IsNullOrWhiteSpace(_application?.CustomerEmail) ? _application!.CustomerEmail! : "N/A";
                BorrowerAccountText.Text = !string.IsNullOrWhiteSpace(_application?.SavingsAccountNumber) ? _application!.SavingsAccountNumber! : "N/A";
                BorrowerAddressText.Text = !string.IsNullOrWhiteSpace(_application?.CustomerAddress) ? _application!.CustomerAddress! : "N/A";
                BorrowerOccupationText.Text = "N/A";
            }

            // Loan Details
            LoanTypeText.Text = FormatLoanType(loan.LoanType);
            StatusText.Text = FormatStatus(loan.Status);
            StatusText.Foreground = loan.Status?.ToLower() == "active" 
                ? System.Windows.Media.Brushes.Green 
                : System.Windows.Media.Brushes.Orange;

            InterestRateText.Text = $"{loan.InterestRate:P2} annuel ({monthlyRate:P2} mensuel)";
            DurationText.Text = $"{termMonths} mois";
            
            DisbursementDateText.Text = loan.DisbursementDate.HasValue 
                ? loan.DisbursementDate.Value.ToString("dd/MM/yyyy") 
                : "N/A";
            MaturityDateText.Text = loan.MaturityDate.HasValue 
                ? loan.MaturityDate.Value.ToString("dd/MM/yyyy") 
                : "N/A";

            BranchText.Text = loan.BranchName ?? "N/A";
            LoanOfficerText.Text = loan.LoanOfficerName ?? "N/A";
            MonthlyPaymentText.Text = $"{monthlyPaymentWithFee:N2} {loan.Currency}";
            
            DaysOverdueText.Text = loan.DaysOverdue > 0 
                ? $"{loan.DaysOverdue} jours" 
                : "Aucun";
            DaysOverdueText.Foreground = loan.DaysOverdue > 0 
                ? System.Windows.Media.Brushes.Red 
                : System.Windows.Media.Brushes.Green;
        }

        private void UpdatePaymentSchedule(List<PaymentScheduleItem>? schedule)
        {
            if (schedule == null || !schedule.Any())
            {
                // Try loading from loan's PaymentSchedule property if available
                if (_loan?.PaymentSchedule != null && _loan.PaymentSchedule.Any())
                {
                    var converted = _loan.PaymentSchedule.Select(s => new PaymentScheduleItem
                    {
                        InstallmentNumber = s.InstallmentNumber,
                        DueDate = DateTime.Parse(s.DueDate.ToString()),
                        PrincipalAmount = s.PrincipalAmount,
                        InterestAmount = s.InterestAmount,
                        FeePortion = s.FeePortion,
                        TotalPayment = s.TotalAmount,
                        TotalAmountWithFee = s.TotalAmountWithFee ?? s.TotalAmount,
                        Status = s.Status
                    }).ToList();
                    
                    ScheduleDataGrid.ItemsSource = converted;
                    NoScheduleText.Visibility = Visibility.Collapsed;
                    return;
                }
                
                ScheduleDataGrid.ItemsSource = null;
                NoScheduleText.Visibility = Visibility.Visible;
                return;
            }

            ScheduleDataGrid.ItemsSource = schedule;
            NoScheduleText.Visibility = Visibility.Collapsed;
        }

        private void UpdatePaymentHistory(List<LoanPayment>? payments)
        {
            if (payments == null || !payments.Any())
            {
                PaymentsDataGrid.ItemsSource = null;
                NoPaymentsText.Visibility = Visibility.Visible;
                return;
            }

            // Sort by date descending (most recent first)
            var sortedPayments = payments.OrderByDescending(p => p.PaymentDate).ToList();
            PaymentsDataGrid.ItemsSource = sortedPayments;
            NoPaymentsText.Visibility = Visibility.Collapsed;
        }

        private decimal CalculateMonthlyPayment(decimal principal, decimal monthlyRate, int months)
        {
            if (months <= 0 || principal <= 0) return 0;
            if (monthlyRate <= 0) return principal / months;

            var rate = monthlyRate;
            var numerator = principal * rate * (decimal)Math.Pow(1 + (double)rate, months);
            var denominator = (decimal)Math.Pow(1 + (double)rate, months) - 1;
            return Math.Round(numerator / denominator, 2);
        }

        private string FormatLoanType(string? loanType)
        {
            if (string.IsNullOrWhiteSpace(loanType)) return "N/A";

            return loanType switch
            {
                "Commercial" => "Commercial",
                "Agricultural" => "Agricole",
                "Personal" => "Personnel",
                "Emergency" => "Urgence",
                "CreditLoyer" => "Crédit Loyer",
                "CreditAuto" => "Crédit Auto",
                "CreditMoto" => "Crédit Moto",
                "CreditPersonnel" => "Crédit Personnel",
                "CreditScolaire" => "Crédit Scolaire",
                "CreditAgricole" => "Crédit Agricole",
                "CreditProfessionnel" => "Crédit Professionnel",
                "CreditAppui" => "Crédit Appui",
                "CreditHypothecaire" => "Crédit Hypothécaire",
                _ => loanType
            };
        }

        private string FormatStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return "N/A";

            return status switch
            {
                "Active" => "Actif",
                "Pending" => "En Attente",
                "Disbursed" => "Décaissé",
                "Completed" => "Complété",
                "Defaulted" => "En Défaut",
                "WrittenOff" => "Passé en Pertes",
                _ => status
            };
        }

        private void CloseButton_Click(object sender, RoutedEventArgs e)
        {
            Close();
        }
    }
}
