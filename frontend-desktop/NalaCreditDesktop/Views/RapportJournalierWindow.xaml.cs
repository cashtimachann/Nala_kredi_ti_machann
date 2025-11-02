using System;
using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using NalaCreditDesktop.Models;
using System.Text;
using System.Security.Cryptography;

namespace NalaCreditDesktop.Views
{
    public partial class RapportJournalierWindow : Window
    {
        private RapportJournalierModel _rapport;
        private DispatcherTimer _generationTimer;

        public RapportJournalierWindow()
        {
            InitializeComponent();
            InitialiserRapport();
        }

        private void InitialiserRapport()
        {
            _rapport = new RapportJournalierModel();
            
            // Initialiser les données simulées
            InitialiserDonneesSimulees();
            AfficherRapport();
            
            // Mettre à jour les informations d'en-tête
            DateRapportText.Text = $"Date: {_rapport.DateRapport:dddd dd MMMM yyyy}";
            HeureGenerationText.Text = $"Généré à: {DateTime.Now:HH:mm:ss}";
            CaissierRapportText.Text = $"Par: {_rapport.NomCaissier}";
        }

        private void InitialiserDonneesSimulees()
        {
            // Simuler les données du rapport journalier
            _rapport.NombreDepots = 23;
            _rapport.NombreRetraits = 18;
            _rapport.NombreChanges = 6;
            _rapport.NombreConsultations = 12;

            // Montants HTG
            _rapport.TotalDepotsHTG = 1250000.00m;
            _rapport.TotalRetraitsHTG = 560000.00m;
            _rapport.TotalChangeHTG = 45000.00m;

            // Montants USD
            _rapport.TotalDepotsUSD = 3200.00m;
            _rapport.TotalRetraitsUSD = 1850.00m;
            _rapport.TotalChangeUSD = 320.00m;

            // Commissions
            _rapport.CommissionDepots = 1150.00m;
            _rapport.CommissionRetraits = 900.00m;
            _rapport.CommissionChanges = 800.00m;

            // Créer des transactions simulées
            _rapport.DetailTransactions = new ObservableCollection<TransactionHistorique>();
            
            // Ajouter quelques transactions d'exemple
            for (int i = 0; i < 15; i++)
            {
                var transaction = new TransactionHistorique
                {
                    Date = DateTime.Today.AddHours(8 + i * 0.75),
                    Type = (TransactionType)(i % 4), // Rotation entre les types
                    NumeroTransaction = $"TXN{(1000 + i):D4}",
                    Montant = 10000 + (i * 5000),
                    Devise = i % 2 == 0 ? DeviseType.HTG : DeviseType.USD,
                    Description = $"Transaction {i + 1}",
                    Caissier = _rapport.NomCaissier
                };
                _rapport.DetailTransactions.Add(transaction);
            }
        }

        private void AfficherRapport()
        {
            // Afficher les résumés
            NombreDepotsText.Text = _rapport.NombreDepots.ToString();
            NombreRetraitsText.Text = _rapport.NombreRetraits.ToString();
            NombreChangesText.Text = _rapport.NombreChanges.ToString();
            NombreConsultationsText.Text = _rapport.NombreConsultations.ToString();

            // Afficher les montants HTG
            TotalDepotsHTGText.Text = $"{_rapport.TotalDepotsHTG:N0}";
            TotalRetraitsHTGText.Text = $"{_rapport.TotalRetraitsHTG:N0}";
            TotalChangeHTGText.Text = $"{(_rapport.TotalChangeHTG >= 0 ? "+" : "")}{_rapport.TotalChangeHTG:N0}";
            
            decimal netHTG = _rapport.TotalDepotsHTG - _rapport.TotalRetraitsHTG + _rapport.TotalChangeHTG;
            NetHTGText.Text = $"{(netHTG >= 0 ? "+" : "")}{netHTG:N0}";

            // Afficher les montants USD
            TotalDepotsUSDText.Text = $"{_rapport.TotalDepotsUSD:N0}";
            TotalRetraitsUSDText.Text = $"{_rapport.TotalRetraitsUSD:N0}";
            TotalChangeUSDText.Text = $"{(_rapport.TotalChangeUSD >= 0 ? "+" : "")}{_rapport.TotalChangeUSD:N0}";
            
            decimal netUSD = _rapport.TotalDepotsUSD - _rapport.TotalRetraitsUSD + _rapport.TotalChangeUSD;
            NetUSDText.Text = $"{(netUSD >= 0 ? "+" : "")}{netUSD:N0}";

            // Afficher les commissions
            CommissionDepotsText.Text = $"{_rapport.CommissionDepots:N0} HTG";
            CommissionRetraitsText.Text = $"{_rapport.CommissionRetraits:N0} HTG";
            CommissionChangesText.Text = $"{_rapport.CommissionChanges:N0} HTG";
            TotalCommissionsText.Text = $"{_rapport.TotalCommissions:N0} HTG";

            // Remplir le DataGrid
            DetailTransactionsGrid.ItemsSource = _rapport.DetailTransactions;
        }

        private void Periode_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (PeriodeComboBox.SelectedItem is ComboBoxItem item)
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
                        // Logique pour la semaine courante
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

        private void SignatureElectronique_Checked(object sender, RoutedEventArgs e)
        {
            SignatureInfoText.Text = "Le rapport sera signé numériquement avec votre identifiant caissier et horodaté";
        }

        private void SignatureElectronique_Unchecked(object sender, RoutedEventArgs e)
        {
            SignatureInfoText.Text = "Le rapport sera généré sans signature électronique";
        }

        private void Actualiser_Click(object sender, RoutedEventArgs e)
        {
            StatutGlobalText.Text = "Actualisation des données...";
            
            // Simuler l'actualisation
            var timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
            timer.Tick += (s, args) =>
            {
                timer.Stop();
                // Dans un vrai système, on rechargerait les données depuis la base
                InitialiserDonneesSimulees();
                AfficherRapport();
                StatutGlobalText.Text = "Données actualisées avec succès";
                HeureGenerationText.Text = $"Actualisé à: {DateTime.Now:HH:mm:ss}";
            };
            timer.Start();
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
            rapport.AppendLine("                           NALA KREDI");
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
            rapport.AppendLine($"Consultations:          {_rapport.NombreConsultations,15:N0}");
            rapport.AppendLine($"TOTAL TRANSACTIONS:     {(_rapport.NombreDepots + _rapport.NombreRetraits + _rapport.NombreChanges),15:N0}");
            rapport.AppendLine();
            rapport.AppendLine("───────────────────────────────────────────────────────────────");
            rapport.AppendLine("MOUVEMENTS FINANCIERS - HTG");
            rapport.AppendLine("───────────────────────────────────────────────────────────────");
            rapport.AppendLine($"Total dépôts HTG:       {_rapport.TotalDepotsHTG,15:N2}");
            rapport.AppendLine($"Total retraits HTG:     {_rapport.TotalRetraitsHTG,15:N2}");
            rapport.AppendLine($"Net changes HTG:        {_rapport.TotalChangeHTG,15:N2}");
            rapport.AppendLine($"NET HTG:                {(_rapport.TotalDepotsHTG - _rapport.TotalRetraitsHTG + _rapport.TotalChangeHTG),15:N2}");
            rapport.AppendLine();
            rapport.AppendLine("───────────────────────────────────────────────────────────────");
            rapport.AppendLine("MOUVEMENTS FINANCIERS - USD");
            rapport.AppendLine("───────────────────────────────────────────────────────────────");
            rapport.AppendLine($"Total dépôts USD:       {_rapport.TotalDepotsUSD,15:N2}");
            rapport.AppendLine($"Total retraits USD:     {_rapport.TotalRetraitsUSD,15:N2}");
            rapport.AppendLine($"Net changes USD:        {_rapport.TotalChangeUSD,15:N2}");
            rapport.AppendLine($"NET USD:                {(_rapport.TotalDepotsUSD - _rapport.TotalRetraitsUSD + _rapport.TotalChangeUSD),15:N2}");
            rapport.AppendLine();
            rapport.AppendLine("───────────────────────────────────────────────────────────────");
            rapport.AppendLine("COMMISSIONS ET FRAIS");
            rapport.AppendLine("───────────────────────────────────────────────────────────────");
            rapport.AppendLine($"Commission dépôts:      {_rapport.CommissionDepots,15:N2} HTG");
            rapport.AppendLine($"Commission retraits:    {_rapport.CommissionRetraits,15:N2} HTG");
            rapport.AppendLine($"Commission changes:     {_rapport.CommissionChanges,15:N2} HTG");
            rapport.AppendLine($"TOTAL COMMISSIONS:      {_rapport.TotalCommissions,15:N2} HTG");
            rapport.AppendLine();

            if (InclureDetailTransactionsCheckBox.IsChecked == true)
            {
                rapport.AppendLine("───────────────────────────────────────────────────────────────");
                rapport.AppendLine("DÉTAIL DES TRANSACTIONS");
                rapport.AppendLine("───────────────────────────────────────────────────────────────");
                rapport.AppendLine("HEURE    TYPE      MONTANT        DEVISE  DESCRIPTION");
                rapport.AppendLine("───────────────────────────────────────────────────────────────");
                
                foreach (var transaction in _rapport.DetailTransactions)
                {
                    rapport.AppendLine($"{transaction.Date:HH:mm}   {transaction.Type,-8} {transaction.Montant,10:N2}   {transaction.Devise,-5}  {transaction.Description}");
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
    }
}