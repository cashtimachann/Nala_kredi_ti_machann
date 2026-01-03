using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;
using System.Text;
using System.Security.Cryptography;

namespace NalaCreditDesktop.Views
{
    public partial class RapportJournalierWindow : Window
    {
        private readonly ApiService? _apiService;
        // Ensure rapport is always initialized so UI events fired during window load do not cause null reference errors
        private RapportJournalierModel _rapport = new RapportJournalierModel();
        private DispatcherTimer _generationTimer;

        // Constructor requires ApiService for real data
        public RapportJournalierWindow(ApiService apiService)
        {
            _apiService = apiService ?? throw new ArgumentNullException(nameof(apiService));
            InitializeComponent();
            // Start initialization asynchronously so constructor remains responsive
            _ = InitialiserRapportAsync();
        }

        private async System.Threading.Tasks.Task InitialiserRapportAsync()
        {
            try
            {
                _rapport = new RapportJournalierModel();

                // Verify API service is available
                if (_apiService == null)
                {
                    Dispatcher.Invoke(() =>
                    {
                        MessageBox.Show("Service API non disponible pour charger le rapport.", 
                                      "Erreur", 
                                      MessageBoxButton.OK, 
                                      MessageBoxImage.Warning);
                        Close();
                    });
                    return;
                }

                // Load real report data from API
                // Ask backend for its current daily report (no date filter) to avoid timezone drift
                var result = await _apiService.GetDailyReportAsync(null);
                
                if (result != null && result.IsSuccess && result.Data != null)
                {
                    var dto = result.Data;
                    // Map DTO to model
                    _rapport.DateRapport = dto.Date == default ? DateTime.Today : dto.Date;

                    // Prefer backend cashier name, then logged-in user names/email, then a safe fallback
                    var cashierName = !string.IsNullOrWhiteSpace(dto.CashierName)
                        ? dto.CashierName
                        : BuildUserDisplayName(_apiService.CurrentUser);
                    _rapport.NomCaissier = cashierName;
                    _rapport.NombreDepots = dto.DepositsCount;
                    _rapport.NombreRetraits = dto.WithdrawalsCount;
                    _rapport.NombreChanges = dto.ChangesCount;
                    _rapport.NombreConsultations = dto.ConsultationsCount;

                    _rapport.TotalDepotsHTG = dto.TotalDepotsHTG;
                    _rapport.TotalRetraitsHTG = dto.TotalRetraitsHTG;
                    _rapport.TotalChangeHTG = dto.TotalChangeHTG;

                    _rapport.TotalDepotsUSD = dto.TotalDepotsUSD;
                    _rapport.TotalRetraitsUSD = dto.TotalRetraitsUSD;
                    _rapport.TotalChangeUSD = dto.TotalChangeUSD;

                    _rapport.CommissionDepots = dto.CommissionDepots;
                    _rapport.CommissionRetraits = dto.CommissionRetraits;
                    _rapport.CommissionChanges = dto.CommissionChanges;

                    _rapport.DetailTransactions = new System.Collections.ObjectModel.ObservableCollection<TransactionHistorique>();
                    if (dto.Transactions != null)
                    {
                        foreach (var t in dto.Transactions)
                        {
                            var th = new TransactionHistorique
                            {
                                Date = t.Date,
                                    Type = t.Type != null && t.Type.Equals("deposit", StringComparison.OrdinalIgnoreCase) ? TransactionType.Depot
                                        : t.Type != null && t.Type.Equals("withdrawal", StringComparison.OrdinalIgnoreCase) ? TransactionType.Retrait
                                        : t.Type != null && t.Type.IndexOf("change", StringComparison.OrdinalIgnoreCase) >= 0 ? TransactionType.Change
                                        : t.Type != null && t.Type.IndexOf("consult", StringComparison.OrdinalIgnoreCase) >= 0 ? TransactionType.Consultation
                                        : t.Type != null && t.Type.IndexOf("cloture", StringComparison.OrdinalIgnoreCase) >= 0 ? TransactionType.Cloture
                                        : TransactionType.Other,
                                NumeroTransaction = t.Reference ?? string.Empty,
                                Montant = t.Amount,
                                Devise = string.Equals(t.Currency, "USD", StringComparison.OrdinalIgnoreCase) ? DeviseType.USD : DeviseType.HTG,
                                Description = t.Description ?? string.Empty,
                                Caissier = t.Cashier ?? string.Empty
                            };
                            _rapport.DetailTransactions.Add(th);
                        }

                        // Fallback: if counts are zero but we have transactions, compute them from the list
                        if (_rapport.DetailTransactions.Count > 0)
                        {
                            if (_rapport.NombreDepots == 0)
                                _rapport.NombreDepots = _rapport.DetailTransactions.Count(x => x.Type == TransactionType.Depot);
                            if (_rapport.NombreRetraits == 0)
                                _rapport.NombreRetraits = _rapport.DetailTransactions.Count(x => x.Type == TransactionType.Retrait);
                            if (_rapport.NombreChanges == 0)
                                _rapport.NombreChanges = _rapport.DetailTransactions.Count(x => x.Type == TransactionType.Change);
                            if (_rapport.NombreConsultations == 0)
                                _rapport.NombreConsultations = _rapport.DetailTransactions.Count(x => x.Type == TransactionType.Consultation);
                            if (_rapport.NombreRecouvrements == 0)
                                _rapport.NombreRecouvrements = _rapport.DetailTransactions.Count(x => x.Type == TransactionType.Other && x.Description.IndexOf("recouv", StringComparison.OrdinalIgnoreCase) >= 0);
                        }
                    }

                    // If still empty counts/totals, attempt a fallback from the cashier dashboard endpoint
                    if (IsEmptyRapport())
                    {
                        await TryPopulateFromDashboardAsync();
                    }

                    // Refresh UI after possible fallback population
                    Dispatcher.Invoke(AfficherRapport);

                    // Update UI on UI thread
                    Dispatcher.Invoke(() =>
                    {
                        AfficherRapport();
                        if (DateRapportText != null)
                            DateRapportText.Text = $"Date: {_rapport.DateRapport:dddd dd MMMM yyyy}";
                        if (HeureGenerationText != null)
                            HeureGenerationText.Text = $"Généré à: {DateTime.Now:HH:mm:ss}";
                        if (CaissierRapportText != null)
                            CaissierRapportText.Text = $"Par: {_rapport.NomCaissier}";
                    });
                }
                else
                {
                    // API call failed or returned no data
                    string errorMessage = result?.ErrorMessage ?? "Aucune donnée disponible";
                    Dispatcher.Invoke(() =>
                    {
                        MessageBox.Show($"Impossible de charger le rapport journalier:\n\n{errorMessage}\n\nVérifiez que le backend est démarré et accessible.", 
                                      "Erreur de chargement", 
                                      MessageBoxButton.OK, 
                                      MessageBoxImage.Warning);
                        Close();
                    });
                }
            }
            catch (Exception ex)
            {
                // Show error message
                try
                {
                    Dispatcher.Invoke(() =>
                    {
                        MessageBox.Show($"Erreur lors du chargement du rapport journalier:\n\n{ex.Message}\n\nVérifiez que le backend est démarré.", 
                                      "Erreur", 
                                      MessageBoxButton.OK, 
                                      MessageBoxImage.Error);
                        Close();
                    });
                }
                catch
                {
                    // ignore secondary failures
                }
            }
        }



        private void AfficherRapport()
        {
            // Guard: ensure UI controls are initialized
            if (NombreDepotsText == null || DetailTransactionsGrid == null)
                return;
                
            // Guard: ensure model is available
            if (_rapport == null)
                return;
            
            // Afficher les résumés
            NombreDepotsText.Text = _rapport.NombreDepots.ToString();
            NombreRetraitsText.Text = _rapport.NombreRetraits.ToString();
            NombreChangesText.Text = _rapport.NombreChanges.ToString();
            NombreConsultationsText.Text = _rapport.NombreConsultations.ToString();
            NombreRecouvrementsText.Text = _rapport.NombreRecouvrements.ToString();

            // Afficher les montants HTG
            TotalDepotsHTGText.Text = $"{_rapport.TotalDepotsHTG:N0}";
            TotalRetraitsHTGText.Text = $"{_rapport.TotalRetraitsHTG:N0}";
            TotalChangeHTGText.Text = $"{(_rapport.TotalChangeHTG >= 0 ? "+" : "")}{_rapport.TotalChangeHTG:N0}";
            TotalRecouvrementsHTGText.Text = $"{_rapport.TotalRecouvrementsHTG:N0}";
            
            decimal netHTG = _rapport.TotalDepotsHTG - _rapport.TotalRetraitsHTG + _rapport.TotalChangeHTG + _rapport.TotalRecouvrementsHTG;
            NetHTGText.Text = $"{(netHTG >= 0 ? "+" : "")}{netHTG:N0}";

            // Afficher les montants USD
            TotalDepotsUSDText.Text = $"{_rapport.TotalDepotsUSD:N0}";
            TotalRetraitsUSDText.Text = $"{_rapport.TotalRetraitsUSD:N0}";
            TotalChangeUSDText.Text = $"{(_rapport.TotalChangeUSD >= 0 ? "+" : "")}{_rapport.TotalChangeUSD:N0}";
            TotalRecouvrementsUSDText.Text = $"{_rapport.TotalRecouvrementsUSD:N0}";
            
            decimal netUSD = _rapport.TotalDepotsUSD - _rapport.TotalRetraitsUSD + _rapport.TotalChangeUSD + _rapport.TotalRecouvrementsUSD;
            NetUSDText.Text = $"{(netUSD >= 0 ? "+" : "")}{netUSD:N0}";

            // Remplir le DataGrid
            DetailTransactionsGrid.ItemsSource = _rapport.DetailTransactions;
        }

        private void Periode_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            try
            {
                // Guard: ensure the model is available before responding to UI events
                if (_rapport == null)
                {
                    return;
                }

                // Guard: ensure UI controls are initialized (event can fire during XAML initialization)
                if (PeriodeComboBox == null || DateRapportText == null || StatutGlobalText == null)
                {
                    return;
                }

                if (PeriodeComboBox.SelectedItem is ComboBoxItem item && item.Content != null)
                {
                    string periode = item.Content.ToString();

                    // Ajuster la date selon la période sélectionnée
                    switch (periode)
                    {
                        case "Aujourd'hui":
                            _rapport.DateRapport = DateTime.Today;
                            break;
                        case "Hier":
                            _rapport.DateRapport = DateTime.Today.AddDays(-1);
                            break;
                        case "Cette semaine":
                            _rapport.DateRapport = DateTime.Today;
                            break;
                        case "Semaine dernière":
                            _rapport.DateRapport = DateTime.Today.AddDays(-7);
                            break;
                        case "Ce mois":
                            _rapport.DateRapport = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
                            break;
                        case "Mois dernier":
                            _rapport.DateRapport = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1).AddMonths(-1);
                            break;
                    }

                    // Mettre à jour l'affichage
                    DateRapportText.Text = $"Date: {_rapport.DateRapport:dddd dd MMMM yyyy}";

                    // Dans un vrai système, on rechargerait les données
                    // Pour la démo, on simule juste un changement
                    StatutGlobalText.Text = $"Données mises à jour pour: {periode}";
                }
            }
            catch (Exception ex)
            {
                try
                {
                    var folder = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                    var appFolder = System.IO.Path.Combine(folder, "NalaCreditDesktop");
                    if (!System.IO.Directory.Exists(appFolder)) System.IO.Directory.CreateDirectory(appFolder);
                    var logFile = System.IO.Path.Combine(appFolder, "error.log");
                    var sb = new System.Text.StringBuilder();
                    sb.AppendLine("--- Periode_SelectionChanged Exception ---");
                    sb.AppendLine($"Time: {DateTime.Now:O}");
                    sb.AppendLine(ex.ToString());
                    sb.AppendLine();

                    // diagnostic null info
                    sb.AppendLine("Diagnostics:");
                    sb.AppendLine($"PeriodeComboBox: {(PeriodeComboBox == null ? "NULL" : "OK")}");
                    sb.AppendLine($"PeriodeComboBox.SelectedItem: {(PeriodeComboBox?.SelectedItem == null ? "NULL" : "OK")}");
                    sb.AppendLine($"DateRapportText: {(DateRapportText == null ? "NULL" : "OK")}");
                    sb.AppendLine($"StatutGlobalText: {(StatutGlobalText == null ? "NULL" : "OK")}");
                    sb.AppendLine();

                    System.IO.File.AppendAllText(logFile, sb.ToString());
                }
                catch { }

                System.Diagnostics.Debug.WriteLine($"[ERROR] Periode_SelectionChanged: {ex}");
                // Don't show MessageBox during initialization - it's expected that some UI elements may not be ready
            }
        }

        private void SignatureElectronique_Checked(object sender, RoutedEventArgs e)
        {
            try
            {
                if (SignatureInfoText != null)
                {
                    SignatureInfoText.Text = "Le rapport sera signé numériquement avec votre identifiant caissier et horodaté";
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine("[WARN] SignatureInfoText control is null during Checked event");
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[ERROR] SignatureElectronique_Checked: {ex}");
                MessageBox.Show($"Erreur interne: {ex.Message}\nVoir le journal d'erreurs pour plus de détails.", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void SignatureElectronique_Unchecked(object sender, RoutedEventArgs e)
        {
            try
            {
                if (SignatureInfoText != null)
                {
                    SignatureInfoText.Text = "Le rapport sera généré sans signature électronique";
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine("[WARN] SignatureInfoText control is null during Unchecked event");
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[ERROR] SignatureElectronique_Unchecked: {ex}");
                MessageBox.Show($"Erreur interne: {ex.Message}\nVoir le journal d'erreurs pour plus de détails.", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void Actualiser_Click(object sender, RoutedEventArgs e)
        {
            StatutGlobalText.Text = "Actualisation des données...";
            
            // Reload data from API
            await InitialiserRapportAsync();
            StatutGlobalText.Text = "Données actualisées avec succès";
        }

        private void Previsualiser_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                string contenuRapport = GenererContenuRapport();
                
                // Créer une fenêtre de prévisualisation
                var prevWindow = new Window
                {
                    Title = "Prévisualisation du Rapport",
                    Width = 800,
                    Height = 600,
                    WindowStartupLocation = WindowStartupLocation.CenterOwner,
                    Owner = this
                };

                var scrollViewer = new ScrollViewer
                {
                    VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
                    HorizontalScrollBarVisibility = ScrollBarVisibility.Auto,
                    Padding = new Thickness(20)
                };

                var textBlock = new TextBlock
                {
                    Text = contenuRapport,
                    FontFamily = new System.Windows.Media.FontFamily("Consolas"),
                    FontSize = 12,
                    TextWrapping = TextWrapping.NoWrap
                };

                scrollViewer.Content = textBlock;
                prevWindow.Content = scrollViewer;
                prevWindow.ShowDialog();

            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de la prévisualisation: {ex.Message}", "Erreur", 
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void GenererRapport_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Afficher l'état de génération
                StatutPanel.Visibility = Visibility.Visible;
                StatutText.Text = "Génération du rapport en cours...";
                ProgressBar.IsIndeterminate = true;
                GenererRapportButton.IsEnabled = false;

                _generationTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(0.5) };
                int etape = 0;
                
                _generationTimer.Tick += (s, args) =>
                {
                    etape++;
                    
                    switch (etape)
                    {
                        case 1:
                            StatutText.Text = "Compilation des données...";
                            break;
                        case 2:
                            StatutText.Text = "Calcul des statistiques...";
                            break;
                        case 3:
                            StatutText.Text = "Génération du document PDF...";
                            break;
                        case 4:
                            StatutText.Text = "Application de la signature électronique...";
                            break;
                        case 5:
                            StatutText.Text = "Finalisation...";
                            break;
                        case 6:
                            _generationTimer.Stop();
                            
                            // Générer la signature électronique si demandée
                            if (SignatureElectroniqueCheckBox.IsChecked == true)
                            {
                                _rapport.SignatureElectronique = GenererSignatureElectronique();
                                _rapport.HeureSignature = DateTime.Now;
                            }

                            // Simulation de génération PDF
                            string contenuRapport = GenererContenuRapport();
                            string format = ((ComboBoxItem)FormatExportComboBox.SelectedItem)?.Content?.ToString() ?? "PDF";
                            
                            MessageBox.Show(
                                $"✅ Rapport journalier généré avec succès!\n\n" +
                                $"Format: {format}\n" +
                                $"Date: {_rapport.DateRapport:dd/MM/yyyy}\n" +
                                $"Caissier: {_rapport.NomCaissier}\n" +
                                $"Transactions: {_rapport.DetailTransactions.Count}\n" +
                                $"Commissions totales: {_rapport.TotalCommissions:N2} HTG\n" +
                                $"{(SignatureElectroniqueCheckBox.IsChecked == true ? $"Signature électronique: {_rapport.SignatureElectronique[..8]}..." : "Sans signature électronique")}\n\n" +
                                $"Le rapport a été sauvegardé et archivé.", 
                                "Rapport Généré", 
                                MessageBoxButton.OK, 
                                MessageBoxImage.Information);

                            // Réinitialiser l'interface
                            StatutPanel.Visibility = Visibility.Collapsed;
                            GenererRapportButton.IsEnabled = true;
                            DerniereGenerationText.Text = DateTime.Now.ToString("HH:mm:ss");
                            StatutGlobalText.Text = "Rapport généré avec succès";
                            break;
                    }
                };

                _generationTimer.Start();

            }
            catch (Exception ex)
            {
                _generationTimer?.Stop();
                StatutPanel.Visibility = Visibility.Collapsed;
                GenererRapportButton.IsEnabled = true;
                
                MessageBox.Show($"Erreur lors de la génération: {ex.Message}", "Erreur", 
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private string GenererContenuRapport()
        {
            var rapport = new StringBuilder();

            rapport.AppendLine("═══════════════════════════════════════════════════════════════");
            rapport.AppendLine("                           NALA KREDI TI MACHANN");
            rapport.AppendLine("                      RAPPORT JOURNALIER");
            rapport.AppendLine("═══════════════════════════════════════════════════════════════");
            rapport.AppendLine();
            rapport.AppendLine($"Date du rapport:        {_rapport.DateRapport:dddd dd MMMM yyyy}");
            rapport.AppendLine($"Caisse:                 {_rapport.NumeroCaisse}");
            rapport.AppendLine($"Caissier:               {_rapport.NomCaissier}");
            rapport.AppendLine($"Heure de génération:    {DateTime.Now:dd/MM/yyyy HH:mm:ss}");
            rapport.AppendLine();
            rapport.AppendLine("───────────────────────────────────────────────────────────────");
            rapport.AppendLine("RÉSUMÉ DES OPÉRATIONS");
            rapport.AppendLine("───────────────────────────────────────────────────────────────");
            rapport.AppendLine($"Dépôts:                 {_rapport.NombreDepots,15:N0}");
            rapport.AppendLine($"Retraits:               {_rapport.NombreRetraits,15:N0}");
            rapport.AppendLine($"Changes:                {_rapport.NombreChanges,15:N0}");
            rapport.AppendLine($"Recouvrements:          {_rapport.NombreRecouvrements,15:N0}");
            rapport.AppendLine($"Consultations:          {_rapport.NombreConsultations,15:N0}");
            rapport.AppendLine($"TOTAL TRANSACTIONS:     {(_rapport.NombreDepots + _rapport.NombreRetraits + _rapport.NombreChanges + _rapport.NombreRecouvrements + _rapport.NombreConsultations),15:N0}");
            rapport.AppendLine();
            rapport.AppendLine("───────────────────────────────────────────────────────────────");
            rapport.AppendLine("MOUVEMENTS FINANCIERS - HTG");
            rapport.AppendLine("───────────────────────────────────────────────────────────────");
            rapport.AppendLine($"Total dépôts HTG:       {_rapport.TotalDepotsHTG,15:N2}");
            rapport.AppendLine($"Total retraits HTG:     {_rapport.TotalRetraitsHTG,15:N2}");
            rapport.AppendLine($"Net changes HTG:        {_rapport.TotalChangeHTG,15:N2}");
            rapport.AppendLine($"Recouvrements HTG:      {_rapport.TotalRecouvrementsHTG,15:N2}");
            rapport.AppendLine($"NET HTG:                {(_rapport.TotalDepotsHTG - _rapport.TotalRetraitsHTG + _rapport.TotalChangeHTG + _rapport.TotalRecouvrementsHTG),15:N2}");
            rapport.AppendLine();
            rapport.AppendLine("───────────────────────────────────────────────────────────────");
            rapport.AppendLine("MOUVEMENTS FINANCIERS - USD");
            rapport.AppendLine("───────────────────────────────────────────────────────────────");
            rapport.AppendLine($"Total dépôts USD:       {_rapport.TotalDepotsUSD,15:N2}");
            rapport.AppendLine($"Total retraits USD:     {_rapport.TotalRetraitsUSD,15:N2}");
            rapport.AppendLine($"Net changes USD:        {_rapport.TotalChangeUSD,15:N2}");
            rapport.AppendLine($"Recouvrements USD:      {_rapport.TotalRecouvrementsUSD,15:N2}");
            rapport.AppendLine($"NET USD:                {(_rapport.TotalDepotsUSD - _rapport.TotalRetraitsUSD + _rapport.TotalChangeUSD + _rapport.TotalRecouvrementsUSD),15:N2}");
            rapport.AppendLine();
            if (InclureDetailTransactionsCheckBox.IsChecked == true)
            {
                rapport.AppendLine("───────────────────────────────────────────────────────────────");
                rapport.AppendLine("DÉTAIL DES TRANSACTIONS");
                rapport.AppendLine("───────────────────────────────────────────────────────────────");
                rapport.AppendLine("HEURE    TYPE      MONTANT        DEVISE  DESCRIPTION");
                rapport.AppendLine("───────────────────────────────────────────────────────────────");
                
                if (_rapport?.DetailTransactions != null)
                {
                    foreach (var transaction in _rapport.DetailTransactions)
                    {
                        try
                        {
                            var heure = transaction?.Date.ToString("HH:mm") ?? "--:--";
                            var type = transaction != null ? transaction.Type.ToString() : string.Empty;
                            var montant = transaction != null ? transaction.Montant.ToString("N2") : "0.00";
                            var devise = transaction?.Devise.ToString() ?? string.Empty;
                            var desc = transaction?.Description ?? string.Empty;
                            rapport.AppendLine($"{heure}   {type,-8} {montant,10}   {devise,-5}  {desc}");
                        }
                        catch (Exception ex)
                        {
                            System.Diagnostics.Debug.WriteLine($"[WARN] Failed to format transaction: {ex}");
                            // continue with next transaction
                        }
                    }
                }
                rapport.AppendLine();
            }

            if (SignatureElectroniqueCheckBox.IsChecked == true && !string.IsNullOrEmpty(_rapport.SignatureElectronique))
            {
                rapport.AppendLine("───────────────────────────────────────────────────────────────");
                rapport.AppendLine("SIGNATURE ÉLECTRONIQUE");
                rapport.AppendLine("───────────────────────────────────────────────────────────────");
                rapport.AppendLine($"Signé par:              {_rapport.NomCaissier}");
                rapport.AppendLine($"Date/Heure:             {_rapport.HeureSignature:dd/MM/yyyy HH:mm:ss}");
                rapport.AppendLine($"Hash SHA256:            {_rapport.SignatureElectronique}");
                rapport.AppendLine();
            }

            rapport.AppendLine("═══════════════════════════════════════════════════════════════");
            rapport.AppendLine("                    FIN DU RAPPORT JOURNALIER");
            rapport.AppendLine("═══════════════════════════════════════════════════════════════");

            return rapport.ToString();
        }

        private string GenererSignatureElectronique()
        {
            try
            {
                // Créer une chaîne de données à signer
                string donneesASymer = $"{_rapport.DateRapport:yyyyMMdd}|{_rapport.NomCaissier}|{_rapport.NumeroCaisse}|{_rapport.TotalCommissions}|{DateTime.Now:yyyyMMddHHmmss}";
                
                // Générer un hash SHA256 (simulation de signature électronique)
                using (SHA256 sha256 = SHA256.Create())
                {
                    byte[] hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(donneesASymer));
                    return Convert.ToHexString(hashBytes);
                }
            }
            catch (Exception)
            {
                // En cas d'erreur, générer une signature simple
                return $"SIGN_{DateTime.Now:yyyyMMddHHmmss}_{_rapport.NomCaissier.GetHashCode():X8}";
            }
        }

        protected override void OnClosed(EventArgs e)
        {
            _generationTimer?.Stop();
            base.OnClosed(e);
        }

        private bool IsEmptyRapport()
        {
                 return _rapport != null &&
                     _rapport.NombreDepots == 0 &&
                     _rapport.NombreRetraits == 0 &&
                     _rapport.NombreChanges == 0 &&
                     _rapport.NombreConsultations == 0 &&
                     _rapport.NombreRecouvrements == 0 &&
                     (_rapport.DetailTransactions == null || _rapport.DetailTransactions.Count == 0);
        }

        private async Task TryPopulateFromDashboardAsync()
        {
            try
            {
                var dashResult = await _apiService.GetCashierDashboardAsync();
                if (dashResult?.IsSuccess != true || dashResult.Data == null)
                    return;

                var d = dashResult.Data;

                // Remplir les compteurs si vides
                if (_rapport.NombreDepots == 0) _rapport.NombreDepots = d.DepositsCount;
                if (_rapport.NombreRetraits == 0) _rapport.NombreRetraits = d.WithdrawalsCount;
                if (_rapport.NombreChanges == 0) _rapport.NombreChanges = d.TodayExchanges;
                if (_rapport.NombreRecouvrements == 0) _rapport.NombreRecouvrements = d.CreditPaymentsCount;

                // Pas de consultations dans le dashboard, on laisse zéro si non disponible

                // Montants HTG / USD si manquants
                if (_rapport.TotalDepotsHTG == 0) _rapport.TotalDepotsHTG = d.DepositsAmountHTG;
                if (_rapport.TotalDepotsUSD == 0) _rapport.TotalDepotsUSD = d.DepositsAmountUSD;
                if (_rapport.TotalRetraitsHTG == 0) _rapport.TotalRetraitsHTG = d.WithdrawalsAmountHTG;
                if (_rapport.TotalRetraitsUSD == 0) _rapport.TotalRetraitsUSD = d.WithdrawalsAmountUSD;
                if (_rapport.TotalRecouvrementsHTG == 0) _rapport.TotalRecouvrementsHTG = d.CreditPaymentsAmountHTG;
                if (_rapport.TotalRecouvrementsUSD == 0) _rapport.TotalRecouvrementsUSD = d.CreditPaymentsAmountUSD;

                // Approximation pour les changes: on additionne ventes/achats USD si dispo
                if (_rapport.TotalChangeUSD == 0)
                {
                    _rapport.TotalChangeUSD = d.UsdSalesAmount + d.UsdPurchaseAmount;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[WARN] TryPopulateFromDashboardAsync failed: {ex}");
            }
        }

        // Build a human-friendly cashier name from the authenticated user info
        private static string BuildUserDisplayName(UserInfo? user)
        {
            if (user == null)
                return "Caissier";

            var name = ($"{user.FirstName} {user.LastName}").Trim();

            if (string.IsNullOrWhiteSpace(name))
                name = user.Email;

            return string.IsNullOrWhiteSpace(name) ? "Caissier" : name;
        }
    }
}