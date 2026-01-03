using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class MyReportsView : UserControl
    {
        private readonly ApiService _apiService;
        private string _selectedReportType = "";
        private List<MicrocreditLoan> _currentLoans = new List<MicrocreditLoan>();

        public MyReportsView(ApiService? apiService = null)
        {
            InitializeComponent();
            _apiService = apiService ?? AppServices.GetRequiredApiService();
            
            SetupEventHandlers();
            InitializeDates();
        }

        private void SetupEventHandlers()
        {
            RefreshButton.Click += RefreshButton_Click;
            PreviewButton.Click += PreviewButton_Click;
            GenerateButton.Click += GenerateButton_Click;
            PrintButton.Click += PrintButton_Click;
        }

        private void InitializeDates()
        {
            // Set default dates: current month
            StartDatePicker.SelectedDate = new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
            EndDatePicker.SelectedDate = DateTime.Now;
        }

        // Report Type Selection Handlers
        private void PortfolioReport_Click(object sender, MouseButtonEventArgs e)
        {
            SelectReportType("Portfolio", "Rapport de Portefeuille");
        }

        private void RecoveryReport_Click(object sender, MouseButtonEventArgs e)
        {
            SelectReportType("Recovery", "Rapport de Recouvrement");
        }

        private void PerformanceReport_Click(object sender, MouseButtonEventArgs e)
        {
            SelectReportType("Performance", "Rapport de Performance");
        }

        private void SelectReportType(string reportType, string displayName)
        {
            _selectedReportType = reportType;
            SelectedReportTypeText.Text = displayName;
            
            // Enable action buttons
            PreviewButton.IsEnabled = true;
            GenerateButton.IsEnabled = true;
            PrintButton.IsEnabled = true;
            
            StatusMessageText.Text = $"{displayName} sélectionné";
            StatusMessageText.Foreground = new System.Windows.Media.SolidColorBrush(
                (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#10b981"));
        }

        private void PeriodPreset_Changed(object sender, SelectionChangedEventArgs e)
        {
            if (PeriodPresetComboBox.SelectedItem is ComboBoxItem item)
            {
                var preset = item.Content.ToString();
                var today = DateTime.Now;

                switch (preset)
                {
                    case "Aujourd'hui":
                        StartDatePicker.SelectedDate = today;
                        EndDatePicker.SelectedDate = today;
                        break;

                    case "Cette semaine":
                        var startOfWeek = today.AddDays(-(int)today.DayOfWeek);
                        StartDatePicker.SelectedDate = startOfWeek;
                        EndDatePicker.SelectedDate = today;
                        break;

                    case "Ce mois":
                        StartDatePicker.SelectedDate = new DateTime(today.Year, today.Month, 1);
                        EndDatePicker.SelectedDate = today;
                        break;

                    case "Mois dernier":
                        var lastMonth = today.AddMonths(-1);
                        StartDatePicker.SelectedDate = new DateTime(lastMonth.Year, lastMonth.Month, 1);
                        EndDatePicker.SelectedDate = new DateTime(lastMonth.Year, lastMonth.Month, 
                            DateTime.DaysInMonth(lastMonth.Year, lastMonth.Month));
                        break;

                    case "Ce trimestre":
                        var quarter = (today.Month - 1) / 3;
                        var startMonth = quarter * 3 + 1;
                        StartDatePicker.SelectedDate = new DateTime(today.Year, startMonth, 1);
                        EndDatePicker.SelectedDate = today;
                        break;

                    case "Cette année":
                        StartDatePicker.SelectedDate = new DateTime(today.Year, 1, 1);
                        EndDatePicker.SelectedDate = today;
                        break;
                }
            }
        }

        private async void RefreshButton_Click(object sender, RoutedEventArgs e)
        {
            await LoadReportDataAsync();
        }

        private async void PreviewButton_Click(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrEmpty(_selectedReportType))
            {
                MessageBox.Show("Veuillez sélectionner un type de rapport.", 
                    "Rapport non sélectionné", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            if (!ValidateDates())
                return;

            await LoadReportDataAsync();
            ShowPreview();
        }

        private async void GenerateButton_Click(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrEmpty(_selectedReportType))
            {
                MessageBox.Show("Veuillez sélectionner un type de rapport.", 
                    "Rapport non sélectionné", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            if (!ValidateDates())
                return;

            await GenerateReportAsync();
        }

        private async void PrintButton_Click(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrEmpty(_selectedReportType))
            {
                MessageBox.Show("Veuillez sélectionner un type de rapport.", 
                    "Rapport non sélectionné", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            if (!ValidateDates())
                return;

            await PrintReportAsync();
        }

        private bool ValidateDates()
        {
            if (!StartDatePicker.SelectedDate.HasValue || !EndDatePicker.SelectedDate.HasValue)
            {
                MessageBox.Show("Veuillez sélectionner les dates de début et de fin.", 
                    "Dates manquantes", MessageBoxButton.OK, MessageBoxImage.Warning);
                return false;
            }

            if (StartDatePicker.SelectedDate > EndDatePicker.SelectedDate)
            {
                MessageBox.Show("La date de début doit être antérieure à la date de fin.", 
                    "Dates invalides", MessageBoxButton.OK, MessageBoxImage.Warning);
                return false;
            }

            return true;
        }

        private async Task LoadReportDataAsync()
        {
            try
            {
                ShowLoading(true);
                StatusMessageText.Text = "Chargement des données...";
                
                // Get all active and overdue loans
                var activeLoans = await _apiService.GetLoansAsync(
                    page: 1,
                    pageSize: 1000,
                    status: "Active",
                    branchId: null,
                    isOverdue: null
                );

                var overdueLoans = await _apiService.GetLoansAsync(
                    page: 1,
                    pageSize: 1000,
                    status: "Overdue",
                    branchId: null,
                    isOverdue: true
                );

                // Combine loans
                _currentLoans.Clear();
                if (activeLoans?.Loans != null)
                    _currentLoans.AddRange(activeLoans.Loans);
                if (overdueLoans?.Loans != null)
                    _currentLoans.AddRange(overdueLoans.Loans);

                // Apply filters
                ApplyFilters();

                StatusMessageText.Text = $"{_currentLoans.Count} prêt(s) chargé(s)";
                StatusMessageText.Foreground = new System.Windows.Media.SolidColorBrush(
                    (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#10b981"));
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors du chargement des données:\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                StatusMessageText.Text = "Erreur de chargement";
                StatusMessageText.Foreground = new System.Windows.Media.SolidColorBrush(
                    (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#ef4444"));
            }
            finally
            {
                ShowLoading(false);
            }
        }

        private void ApplyFilters()
        {
            var filtered = _currentLoans.AsEnumerable();

            // Status filter
            var statusFilter = (StatusFilterComboBox.SelectedItem as ComboBoxItem)?.Content.ToString();
            if (!string.IsNullOrEmpty(statusFilter) && statusFilter != "Tous")
            {
                filtered = statusFilter switch
                {
                    "Actifs uniquement" => filtered.Where(l => l.Status == "Active"),
                    "En retard uniquement" => filtered.Where(l => l.DaysOverdue > 0),
                    "À jour uniquement" => filtered.Where(l => l.Status == "Active" && l.DaysOverdue == 0),
                    _ => filtered
                };
            }

            // Loan type filter
            var loanTypeFilter = (LoanTypeFilterComboBox.SelectedItem as ComboBoxItem)?.Content.ToString();
            if (!string.IsNullOrEmpty(loanTypeFilter) && loanTypeFilter != "Tous")
            {
                var typeMapping = new Dictionary<string, string>
                {
                    ["Personnel"] = "PERSONAL",
                    ["Commerce"] = "BUSINESS",
                    ["Agricole"] = "AGRICULTURAL",
                    ["Éducation"] = "EDUCATION"
                };

                if (typeMapping.TryGetValue(loanTypeFilter, out var mappedType))
                {
                    filtered = filtered.Where(l => l.LoanType == mappedType);
                }
            }

            _currentLoans = filtered.ToList();
        }

        private void ShowPreview()
        {
            var summary = GenerateReportSummary();
            SummaryText.Text = summary;
            ReportSummaryPanel.Visibility = Visibility.Visible;
        }

        private string GenerateReportSummary()
        {
            var sb = new StringBuilder();
            var startDate = StartDatePicker.SelectedDate ?? DateTime.Now;
            var endDate = EndDatePicker.SelectedDate ?? DateTime.Now;

            sb.AppendLine($"Période: {startDate:dd/MM/yyyy} - {endDate:dd/MM/yyyy}");
            sb.AppendLine($"Nombre de prêts: {_currentLoans.Count}");
            sb.AppendLine();

            switch (_selectedReportType)
            {
                case "Portfolio":
                    var totalPortfolio = _currentLoans.Sum(l => l.RemainingBalance);
                    var activeCount = _currentLoans.Count(l => l.Status == "Active");
                    sb.AppendLine($"💼 PORTEFEUILLE");
                    sb.AppendLine($"   • Prêts actifs: {activeCount}");
                    sb.AppendLine($"   • Encours total: {totalPortfolio:N2} HTG");
                    sb.AppendLine($"   • Montant moyen: {(activeCount > 0 ? totalPortfolio / activeCount : 0):N2} HTG");
                    break;

                case "Recovery":
                    var overdueLoans = _currentLoans.Where(l => l.DaysOverdue > 0).ToList();
                    var criticalLoans = overdueLoans.Count(l => l.DaysOverdue >= 60);
                    var severeLoans = overdueLoans.Count(l => l.DaysOverdue >= 31 && l.DaysOverdue < 60);
                    var moderateLoans = overdueLoans.Count(l => l.DaysOverdue > 0 && l.DaysOverdue < 31);
                    var totalOverdue = overdueLoans.Sum(l => l.RemainingBalance);

                    sb.AppendLine($"⚠️ RECOUVREMENT");
                    sb.AppendLine($"   • Total en retard: {overdueLoans.Count}");
                    sb.AppendLine($"   • Critique (60+ j): {criticalLoans}");
                    sb.AppendLine($"   • Sévère (31-60 j): {severeLoans}");
                    sb.AppendLine($"   • Modéré (1-30 j): {moderateLoans}");
                    sb.AppendLine($"   • Montant total: {totalOverdue:N2} HTG");
                    break;

                case "Performance":
                    var totalDisbursed = _currentLoans.Sum(l => l.PrincipalAmount);
                    var totalCollected = _currentLoans.Sum(l => l.PrincipalAmount - l.RemainingBalance);
                    var collectionRate = totalDisbursed > 0 ? (totalCollected / totalDisbursed * 100) : 0;

                    sb.AppendLine($"📊 PERFORMANCE");
                    sb.AppendLine($"   • Prêts décaissés: {_currentLoans.Count}");
                    sb.AppendLine($"   • Montant décaissé: {totalDisbursed:N2} HTG");
                    sb.AppendLine($"   • Montant collecté: {totalCollected:N2} HTG");
                    sb.AppendLine($"   • Taux de collecte: {collectionRate:F1}%");
                    break;
            }

            return sb.ToString();
        }

        private async Task GenerateReportAsync()
        {
            try
            {
                ShowLoading(true);
                GenerationProgressBar.Visibility = Visibility.Visible;
                StatusMessageText.Text = "Génération du rapport...";

                await LoadReportDataAsync();

                // Simulate report generation
                await Task.Delay(1500);

                var format = (ExportFormatComboBox.SelectedItem as ComboBoxItem)?.Content.ToString() ?? "PDF";
                var formatType = format.Contains("PDF") ? "PDF" : format.Contains("Excel") ? "Excel" : "CSV";

                var reportContent = GenerateReportContent();
                
                // Copy to clipboard
                Clipboard.SetText(reportContent);

                MessageBox.Show(
                    $"Rapport généré avec succès!\n\n" +
                    $"Type: {_selectedReportType}\n" +
                    $"Format: {formatType}\n" +
                    $"Période: {StartDatePicker.SelectedDate:dd/MM/yyyy} - {EndDatePicker.SelectedDate:dd/MM/yyyy}\n" +
                    $"Prêts inclus: {_currentLoans.Count}\n\n" +
                    $"Le contenu du rapport a été copié dans le presse-papiers.\n" +
                    $"Dans une version complète, le fichier {formatType} serait téléchargé.",
                    "Rapport Généré",
                    MessageBoxButton.OK,
                    MessageBoxImage.Information);

                StatusMessageText.Text = "Rapport généré avec succès";
                StatusMessageText.Foreground = new System.Windows.Media.SolidColorBrush(
                    (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#10b981"));
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de la génération:\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                StatusMessageText.Text = "Erreur de génération";
            }
            finally
            {
                ShowLoading(false);
                GenerationProgressBar.Visibility = Visibility.Collapsed;
            }
        }

        private string GenerateReportContent()
        {
            var sb = new StringBuilder();
            var startDate = StartDatePicker.SelectedDate ?? DateTime.Now;
            var endDate = EndDatePicker.SelectedDate ?? DateTime.Now;

            sb.AppendLine("═══════════════════════════════════════════════════════════════");
            sb.AppendLine($"                    {SelectedReportTypeText.Text}");
            sb.AppendLine("═══════════════════════════════════════════════════════════════");
            sb.AppendLine();
            sb.AppendLine($"Période: {startDate:dd/MM/yyyy} - {endDate:dd/MM/yyyy}");
            sb.AppendLine($"Date de génération: {DateTime.Now:dd/MM/yyyy HH:mm}");
            sb.AppendLine();
            sb.AppendLine("───────────────────────────────────────────────────────────────");
            sb.AppendLine("RÉSUMÉ");
            sb.AppendLine("───────────────────────────────────────────────────────────────");
            sb.AppendLine(GenerateReportSummary());
            sb.AppendLine();
            sb.AppendLine("───────────────────────────────────────────────────────────────");
            sb.AppendLine("DÉTAILS DES PRÊTS");
            sb.AppendLine("───────────────────────────────────────────────────────────────");
            sb.AppendLine();

            foreach (var loan in _currentLoans.Take(50)) // Limit to 50 for demo
            {
                sb.AppendLine($"Prêt: {loan.LoanNumber}");
                sb.AppendLine($"  Emprunteur: {loan.BorrowerFirstName} {loan.BorrowerLastName}");
                sb.AppendLine($"  Téléphone: {loan.BorrowerPhone}");
                sb.AppendLine($"  Montant initial: {loan.PrincipalAmount:N2} HTG");
                sb.AppendLine($"  Reste à payer: {loan.RemainingBalance:N2} HTG");
                sb.AppendLine($"  Statut: {loan.Status}");
                sb.AppendLine($"  Retard: {loan.DaysOverdue} jour(s)");
                sb.AppendLine();
            }

            if (_currentLoans.Count > 50)
            {
                sb.AppendLine($"... et {_currentLoans.Count - 50} autres prêts");
            }

            sb.AppendLine();
            sb.AppendLine("═══════════════════════════════════════════════════════════════");
            sb.AppendLine("                    Fin du rapport");
            sb.AppendLine("═══════════════════════════════════════════════════════════════");

            return sb.ToString();
        }

        private async Task PrintReportAsync()
        {
            try
            {
                ShowLoading(true);
                StatusMessageText.Text = "Préparation de l'impression...";

                await LoadReportDataAsync();
                await Task.Delay(1000); // Simulate print preparation

                MessageBox.Show(
                    $"Fonction d'impression disponible!\n\n" +
                    $"Dans une version complète, le rapport serait envoyé à l'imprimante.\n\n" +
                    $"Type: {_selectedReportType}\n" +
                    $"Période: {StartDatePicker.SelectedDate:dd/MM/yyyy} - {EndDatePicker.SelectedDate:dd/MM/yyyy}\n" +
                    $"Prêts: {_currentLoans.Count}",
                    "Impression",
                    MessageBoxButton.OK,
                    MessageBoxImage.Information);

                StatusMessageText.Text = "Prêt à imprimer";
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur:\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                ShowLoading(false);
            }
        }

        private void ShowLoading(bool show)
        {
            if (show)
            {
                PreviewButton.IsEnabled = false;
                GenerateButton.IsEnabled = false;
                PrintButton.IsEnabled = false;
            }
            else
            {
                PreviewButton.IsEnabled = !string.IsNullOrEmpty(_selectedReportType);
                GenerateButton.IsEnabled = !string.IsNullOrEmpty(_selectedReportType);
                PrintButton.IsEnabled = !string.IsNullOrEmpty(_selectedReportType);
            }
        }
    }
}
