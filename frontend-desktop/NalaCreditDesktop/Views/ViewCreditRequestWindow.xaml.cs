using System;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class ViewCreditRequestWindow : Window
    {
        private readonly ApiService _apiService;
        private readonly Guid _applicationId;

        public ViewCreditRequestWindow(ApiService apiService, Guid applicationId)
        {
            InitializeComponent();
            _apiService = apiService;
            _applicationId = applicationId;
            
            CloseButton.Click += CloseButton_Click;
            
            _ = LoadApplicationDetailsAsync();
        }

        private async Task LoadApplicationDetailsAsync()
        {
            try
            {
                LoadingPanel.Visibility = Visibility.Visible;
                ContentPanel.Visibility = Visibility.Collapsed;

                // Call API to get application details
                var result = await _apiService.GetMicrocreditApplicationAsync(_applicationId);

                if (result.IsSuccess && result.Data != null)
                {
                    PopulateApplicationDetails(result.Data);
                    LoadingPanel.Visibility = Visibility.Collapsed;
                    ContentPanel.Visibility = Visibility.Visible;
                }
                else
                {
                    MessageBox.Show($"Erreur lors du chargement: {result.ErrorMessage}",
                        "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                    Close();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur inattendue: {ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                Close();
            }
        }

        private void PopulateApplicationDetails(MicrocreditLoanApplicationDto app)
        {
            // Header
            ApplicationIdText.Text = string.IsNullOrEmpty(app.ApplicationNumber) 
                ? $"ID: {app.Id}" 
                : app.ApplicationNumber;
            StatusText.Text = FormatStatus(app.Status);
            StatusBadge.Background = GetStatusColor(app.Status);

            // Client Info
            CustomerNameText.Text = app.CustomerName ?? "---";
            PhoneText.Text = app.Phone ?? "---";
            EmailText.Text = app.Email ?? "---";
            AccountNumberText.Text = app.SavingsAccountNumber ?? "---";
            AddressText.Text = app.CustomerAddress ?? "---";
            OccupationText.Text = app.Occupation ?? "---";

            // Credit Details
            LoanTypeText.Text = FormatLoanType(app.LoanType);
            RequestedAmountText.Text = $"{app.RequestedAmount:N2} {app.Currency}";
            DurationText.Text = $"{app.RequestedDurationMonths} mois";
            CurrencyText.Text = app.Currency.ToString();
            InterestRateText.Text = $"{app.InterestRate * 100:N2}%";
            MonthlyInterestRateText.Text = $"{app.MonthlyInterestRate * 100:N2}%";
            PurposeText.Text = app.Purpose ?? "---";
            BusinessPlanText.Text = app.BusinessPlan ?? "Aucun";

            // Financial Info
            MonthlyIncomeText.Text = $"{app.MonthlyIncome:N2} {app.Currency}";
            MonthlyExpensesText.Text = $"{app.MonthlyExpenses:N2} {app.Currency}";
            ExistingDebtsText.Text = $"{app.ExistingDebts:N2} {app.Currency}";

            // Collateral
            CollateralTypeText.Text = app.CollateralType ?? "Aucune";
            CollateralValueText.Text = app.CollateralValue.HasValue ? $"{app.CollateralValue.Value:N2} {app.Currency}" : "---";
            CollateralDescriptionText.Text = app.CollateralDescription ?? "---";

            // Guarantors
            if (!string.IsNullOrEmpty(app.Guarantor1Name))
            {
                Guarantor1Text.Text = $"{app.Guarantor1Name}\nTél: {app.Guarantor1Phone ?? "---"}\nRelation: {app.Guarantor1Relation ?? "---"}";
            }
            else
            {
                Guarantor1Text.Text = "Aucun";
            }

            if (!string.IsNullOrEmpty(app.Guarantor2Name))
            {
                Guarantor2Text.Text = $"{app.Guarantor2Name}\nTél: {app.Guarantor2Phone ?? "---"}\nRelation: {app.Guarantor2Relation ?? "---"}";
            }
            else
            {
                Guarantor2Text.Text = "Aucun";
            }

            // References
            if (!string.IsNullOrEmpty(app.Reference1Name))
            {
                Reference1Text.Text = $"{app.Reference1Name}\nTél: {app.Reference1Phone ?? "---"}";
            }
            else
            {
                Reference1Text.Text = "Aucune";
            }

            if (!string.IsNullOrEmpty(app.Reference2Name))
            {
                Reference2Text.Text = $"{app.Reference2Name}\nTél: {app.Reference2Phone ?? "---"}";
            }
            else
            {
                Reference2Text.Text = "Aucune";
            }

            // Documents
            DocumentsPanel.Children.Clear();
            if (app.HasNationalId)
                AddDocumentBadge("✓ Carte d'Identité Nationale");
            if (app.HasProofOfResidence)
                AddDocumentBadge("✓ Justificatif de Domicile");
            if (app.HasProofOfIncome)
                AddDocumentBadge("✓ Justificatif de Revenus");
            if (app.HasCollateralDocs)
                AddDocumentBadge("✓ Documents de Garantie");

            if (DocumentsPanel.Children.Count == 0)
            {
                var noDocsText = new TextBlock
                {
                    Text = "Aucun document",
                    FontStyle = FontStyles.Italic,
                    Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#94a3b8"))
                };
                DocumentsPanel.Children.Add(noDocsText);
            }

            // Notes
            NotesText.Text = app.Notes ?? "Aucune note";
            if (!string.IsNullOrEmpty(app.Notes))
            {
                NotesText.FontStyle = FontStyles.Normal;
                NotesText.Foreground = Brushes.Black;
            }

            // Dates
            CreatedAtText.Text = app.CreatedAt.ToString("dd/MM/yyyy HH:mm");
            SubmittedAtText.Text = app.SubmittedAt?.ToString("dd/MM/yyyy HH:mm") ?? "Non soumis";
            ApprovedAtText.Text = app.ApprovedAt?.ToString("dd/MM/yyyy HH:mm") ?? "Non approuvé";
        }

        private void AddDocumentBadge(string text)
        {
            var border = new Border
            {
                Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#dcfce7")),
                CornerRadius = new CornerRadius(5),
                Padding = new Thickness(10, 5, 10, 5),
                Margin = new Thickness(0, 0, 10, 5),
                HorizontalAlignment = HorizontalAlignment.Left
            };

            var textBlock = new TextBlock
            {
                Text = text,
                FontSize = 13,
                Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#166534"))
            };

            border.Child = textBlock;
            DocumentsPanel.Children.Add(border);
        }

        private string FormatLoanType(MicrocreditLoanType loanType)
        {
            return loanType switch
            {
                MicrocreditLoanType.Commercial => "Crédit Commercial",
                MicrocreditLoanType.Agricultural => "Crédit Agricole",
                MicrocreditLoanType.Personal => "Crédit Personnel",
                MicrocreditLoanType.Emergency => "Crédit d'Urgence",
                MicrocreditLoanType.CreditLoyer => "Crédit Loyer",
                MicrocreditLoanType.CreditAuto => "Crédit Auto",
                MicrocreditLoanType.CreditMoto => "Crédit Moto",
                MicrocreditLoanType.CreditPersonnel => "Crédit Personnel (Alt)",
                MicrocreditLoanType.CreditScolaire => "Crédit Scolaire",
                MicrocreditLoanType.CreditAgricole => "Crédit Agricole (Alt)",
                MicrocreditLoanType.CreditProfessionnel => "Crédit Professionnel",
                MicrocreditLoanType.CreditAppui => "Crédit d'Appui",
                MicrocreditLoanType.CreditHypothecaire => "Crédit Hypothécaire",
                _ => loanType.ToString()
            };
        }

        private string FormatStatus(string status)
        {
            return status switch
            {
                "Draft" => "Brouillon",
                "Submitted" => "Soumis",
                "UnderReview" => "En révision",
                "Approved" => "Approuvé",
                "Rejected" => "Rejeté",
                "Disbursed" => "Décaissé",
                "Active" => "Actif",
                "Closed" => "Fermé",
                _ => status
            };
        }

        private Brush GetStatusColor(string status)
        {
            var colorString = status switch
            {
                "Draft" => "#94a3b8",
                "Submitted" => "#3b82f6",
                "UnderReview" => "#f59e0b",
                "Approved" => "#10b981",
                "Rejected" => "#ef4444",
                "Disbursed" => "#8b5cf6",
                "Active" => "#06b6d4",
                "Closed" => "#64748b",
                _ => "#94a3b8"
            };

            return new SolidColorBrush((Color)ColorConverter.ConvertFromString(colorString));
        }

        private void CloseButton_Click(object sender, RoutedEventArgs e)
        {
            Close();
        }
    }
}
