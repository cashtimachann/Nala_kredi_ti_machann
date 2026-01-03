using System;
using System.Windows;

namespace NalaCreditDesktop.Views
{
    public partial class ApproveApplicationDialog : Window
    {
        public decimal ApprovedAmount { get; private set; }
        public decimal InterestRate { get; private set; }
        public int DurationMonths { get; private set; }
        public DateTime DisbursementDate { get; private set; }
        public string Comments { get; private set; } = string.Empty;

        private readonly decimal _requestedAmount;
        private readonly decimal _requestedRate;
        private readonly int _requestedDuration;

        public ApproveApplicationDialog(string applicationNumber, decimal requestedAmount, decimal requestedRate, int requestedDuration)
        {
            InitializeComponent();
            
            _requestedAmount = requestedAmount;
            _requestedRate = requestedRate;
            _requestedDuration = requestedDuration;
            
            ApplicationNumberText.Text = $"Demande {applicationNumber}";
            RequestedAmountTextBox.Text = $"{requestedAmount:N2} HTG";
            
            // Pre-fill with requested values
            ApprovedAmountTextBox.Text = requestedAmount.ToString("N2");
            InterestRateTextBox.Text = (requestedRate * 100).ToString("N2"); // Convert to percentage
            DurationMonthsTextBox.Text = requestedDuration.ToString();
            DisbursementDatePicker.SelectedDate = DateTime.Today;
            
            ValidateInputs();
        }

        private void ApproveButton_Click(object sender, RoutedEventArgs e)
        {
            if (!ValidateInputs())
            {
                return;
            }

            try
            {
                ApprovedAmount = decimal.Parse(ApprovedAmountTextBox.Text.Replace(",", ""));
                InterestRate = decimal.Parse(InterestRateTextBox.Text.Replace(",", "")) / 100m; // Convert percentage to decimal
                DurationMonths = int.Parse(DurationMonthsTextBox.Text);
                DisbursementDate = DisbursementDatePicker.SelectedDate!.Value;
                Comments = CommentsTextBox.Text ?? string.Empty;

                DialogResult = true;
                Close();
            }
            catch (Exception ex)
            {
                ShowValidationMessage($"Erreur: {ex.Message}");
            }
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
            Close();
        }

        private bool ValidateInputs()
        {
            // Check approved amount
            if (string.IsNullOrWhiteSpace(ApprovedAmountTextBox.Text))
            {
                ShowValidationMessage("Veuillez saisir le montant approuvé");
                return false;
            }

            if (!decimal.TryParse(ApprovedAmountTextBox.Text.Replace(",", ""), out decimal approvedAmount))
            {
                ShowValidationMessage("Montant approuvé invalide");
                return false;
            }

            if (approvedAmount <= 0)
            {
                ShowValidationMessage("Le montant approuvé doit être supérieur à 0");
                return false;
            }

            if (approvedAmount > _requestedAmount * 1.5m)
            {
                ShowValidationMessage($"Le montant approuvé ne peut pas dépasser 150% du montant demandé ({_requestedAmount * 1.5m:N2} HTG)");
                return false;
            }

            // Check interest rate
            if (string.IsNullOrWhiteSpace(InterestRateTextBox.Text))
            {
                ShowValidationMessage("Veuillez saisir le taux d'intérêt");
                return false;
            }

            if (!decimal.TryParse(InterestRateTextBox.Text.Replace(",", ""), out decimal rate))
            {
                ShowValidationMessage("Taux d'intérêt invalide");
                return false;
            }

            if (rate <= 0 || rate > 20)
            {
                ShowValidationMessage("Le taux d'intérêt doit être entre 0.01% et 20%");
                return false;
            }

            // Check duration
            if (string.IsNullOrWhiteSpace(DurationMonthsTextBox.Text))
            {
                ShowValidationMessage("Veuillez saisir la durée");
                return false;
            }

            if (!int.TryParse(DurationMonthsTextBox.Text, out int duration))
            {
                ShowValidationMessage("Durée invalide");
                return false;
            }

            if (duration < 1 || duration > 60)
            {
                ShowValidationMessage("La durée doit être entre 1 et 60 mois");
                return false;
            }

            // Check disbursement date
            if (!DisbursementDatePicker.SelectedDate.HasValue)
            {
                ShowValidationMessage("Veuillez sélectionner la date de décaissement");
                return false;
            }

            DateTime disbursementDate = DisbursementDatePicker.SelectedDate.Value;
            if (disbursementDate < DateTime.Today)
            {
                ShowValidationMessage("La date de décaissement ne peut pas être dans le passé");
                return false;
            }

            if (disbursementDate > DateTime.Today.AddDays(30))
            {
                ShowValidationMessage("La date de décaissement ne peut pas dépasser 30 jours");
                return false;
            }

            HideValidationMessage();
            return true;
        }

        private void ShowValidationMessage(string message)
        {
            ValidationMessageText.Text = message;
            ValidationMessageText.Visibility = Visibility.Visible;
        }

        private void HideValidationMessage()
        {
            ValidationMessageText.Visibility = Visibility.Collapsed;
        }

        private void ApprovedAmountTextBox_TextChanged(object sender, System.Windows.Controls.TextChangedEventArgs e)
        {
            ValidateInputs();
        }

        private void InterestRateTextBox_TextChanged(object sender, System.Windows.Controls.TextChangedEventArgs e)
        {
            ValidateInputs();
        }

        private void DurationMonthsTextBox_TextChanged(object sender, System.Windows.Controls.TextChangedEventArgs e)
        {
            ValidateInputs();
        }

        private void DisbursementDatePicker_SelectedDateChanged(object sender, System.Windows.Controls.SelectionChangedEventArgs e)
        {
            ValidateInputs();
        }
    }
}
