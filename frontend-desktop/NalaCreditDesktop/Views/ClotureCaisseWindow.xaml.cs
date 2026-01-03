using System;
using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Threading;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;
using System.Collections.ObjectModel;

namespace NalaCreditDesktop.Views
{
    public partial class ClotureCaisseWindow : Window
    {
        private ClotureModel _cloture;
        private DispatcherTimer _verificationTimer;
        private bool _verificationsTerminees = false;
        private decimal _toleranceEcart = 100; // HTG

        public ClotureCaisseWindow()
        {
            InitializeComponent();
            InitialiserCloture();
        }

        private void InitialiserCloture()
        {
            _cloture = new ClotureModel
            {
                HeureDebut = DateTime.Today.AddHours(8).AddMinutes(30), // 8:30 AM
                HeureFin = DateTime.Now
            };

            // Set caissier to logged-in user if available
            try
            {
                var apiService = AppServices.GetRequiredApiService();
                var user = apiService?.CurrentUser;
                if (user != null)
                {
                    _cloture.Caissier = string.IsNullOrWhiteSpace(user.FirstName) ? user.Email : (string.IsNullOrWhiteSpace(user.LastName) ? user.FirstName : $"{user.FirstName} {user.LastName}");
                }
            }
            catch { }

            // Initialiser les données simulées pour la démonstration
            InitialiserDonneesSimulees();
            AfficherInformationsSession();
            CalculerFondsTheoriques();
        }

        private void InitialiserDonneesSimulees()
        {
            // Simuler les totaux de la journée
            _cloture.TotalDepotsHTG = 1250000.00m;
            _cloture.TotalDepotsUSD = 3200.00m;
            _cloture.TotalRetraitsHTG = 560000.00m;
            _cloture.TotalRetraitsUSD = 1850.00m;
            _cloture.TotalChangeHTG = 45000.00m; // Net des changes
            _cloture.TotalChangeUSD = 320.00m;
            _cloture.NombreTransactions = 47;
            _cloture.TotalCommissions = 2850.00m;

            // Créer quelques transactions simulées
            _cloture.TransactionsDuJour = new ObservableCollection<TransactionHistorique>
            {
                new TransactionHistorique { Date = DateTime.Now.AddHours(-1), Type = TransactionType.Depot, Devise = DeviseType.HTG, Montant = 25000, Caissier = "Marie Dupont" },
                new TransactionHistorique { Date = DateTime.Now.AddHours(-2), Type = TransactionType.Retrait, Devise = DeviseType.USD, Montant = 200, Caissier = "Marie Dupont" },
                new TransactionHistorique { Date = DateTime.Now.AddHours(-3), Type = TransactionType.Change, Devise = DeviseType.USD, Montant = 150, Caissier = "Marie Dupont" }
            };
        }

        private void AfficherInformationsSession()
        {
            CaissierNomText.Text = _cloture.Caissier;
            NumeroCaisseText.Text = $"Caisse: {_cloture.NumeroCaisse}";
            SuccursaleText.Text = "Succursale Centre-Ville";

            HeureOuvertureText.Text = $"Ouverture: {_cloture.HeureDebut:HH:mm}";
            HeureClotureText.Text = $"Clôture: {_cloture.HeureFin:HH:mm}";
            
            TimeSpan duree = _cloture.HeureFin - _cloture.HeureDebut;
            DureeSessionText.Text = $"Durée: {duree.Hours}h {duree.Minutes}m";

            NombreTransactionsText.Text = $"Transactions: {_cloture.NombreTransactions}";
            ClientsServisText.Text = $"Clients servis: {(_cloture.NombreTransactions * 0.85):F0}"; // Estimation
            TempsMoyenText.Text = $"Temps moyen: {(duree.TotalMinutes / _cloture.NombreTransactions):F0}m";
        }

        private void CalculerFondsTheoriques()
        {
            // Afficher les composants
            SoldeOuvertureHTGText.Text = $"{_cloture.SoldeOuvertureHTG:N2}";
            SoldeOuvertureUSDText.Text = $"{_cloture.SoldeOuvertureUSD:N2}";

            TotalDepotsHTGText.Text = $"{_cloture.TotalDepotsHTG:N2}";
            TotalDepotsUSDText.Text = $"{_cloture.TotalDepotsUSD:N2}";

            TotalRetraitsHTGText.Text = $"{_cloture.TotalRetraitsHTG:N2}";
            TotalRetraitsUSDText.Text = $"{_cloture.TotalRetraitsUSD:N2}";

            TotalChangeHTGText.Text = $"{_cloture.TotalChangeHTG:N2}";
            TotalChangeUSDText.Text = $"{_cloture.TotalChangeUSD:N2}";

            // Calculer et afficher les totaux théoriques
            FondsTheoriqueHTGText.Text = $"{_cloture.FondsTheoriquesHTG:N2}";
            FondsTheoriqueUSDText.Text = $"{_cloture.FondsTheoriquesUSD:N2}";
        }

        private void LancerVerification_Click(object sender, RoutedEventArgs e)
        {
            LancerVerificationButton.IsEnabled = false;
            _verificationTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(1)
            };

            int etapeActuelle = 0;
            _verificationTimer.Tick += (s, args) =>
            {
                etapeActuelle++;
                
                switch (etapeActuelle)
                {
                    case 1:
                        // Vérification transactions en cours
                        VerificationTransactionsIcon.Text = "🔄";
                        VerificationTransactionsText.Text = "Vérification des transactions...";
                        break;
                        
                    case 3:
                        // Transactions OK
                        VerificationTransactionsIcon.Text = "✅";
                        VerificationTransactionsText.Text = "Aucune transaction en cours";
                        VerificationTransactionsBorder.Background = new SolidColorBrush(Colors.LightGreen);
                        VerificationTransactionsBorder.BorderBrush = new SolidColorBrush(Colors.Green);
                        
                        // Commencer vérification écarts
                        VerificationEcartsIcon.Text = "🔄";
                        VerificationEcartsText.Text = "Analyse des écarts potentiels...";
                        break;
                        
                    case 5:
                        // Écarts OK
                        VerificationEcartsIcon.Text = "✅";
                        VerificationEcartsText.Text = "Écarts dans les limites acceptables";
                        VerificationEcartsBorder.Background = new SolidColorBrush(Colors.LightGreen);
                        VerificationEcartsBorder.BorderBrush = new SolidColorBrush(Colors.Green);
                        
                        // Commencer synchronisation
                        VerificationSauvegardesIcon.Text = "🔄";
                        VerificationSauvegardesText.Text = "Synchronisation en cours...";
                        break;
                        
                    case 7:
                        // Synchronisation OK
                        VerificationSauvegardesIcon.Text = "✅";
                        VerificationSauvegardesText.Text = "Données synchronisées avec succès";
                        VerificationSauvegardesBorder.Background = new SolidColorBrush(Colors.LightGreen);
                        VerificationSauvegardesBorder.BorderBrush = new SolidColorBrush(Colors.Green);
                        
                        // Terminer
                        _verificationsTerminees = true;
                        _verificationTimer.Stop();
                        
                        MessageBox.Show("✅ Toutes les vérifications sont terminées avec succès!\n\nVous pouvez maintenant procéder au comptage des fonds.", 
                            "Vérifications Terminées", MessageBoxButton.OK, MessageBoxImage.Information);
                        
                        // Activer la saisie des fonds réels
                        FondsReelsHTGTextBox.IsEnabled = true;
                        FondsReelsUSDTextBox.IsEnabled = true;
                        break;
                }
            };

            _verificationTimer.Start();
        }

        private void FondsReels_TextChanged(object sender, TextChangedEventArgs e)
        {
            CalculerEcarts();
        }

        private void CalculerEcarts()
        {
            bool htgValide = decimal.TryParse(FondsReelsHTGTextBox.Text, out decimal fondsReelsHTG);
            bool usdValide = decimal.TryParse(FondsReelsUSDTextBox.Text, out decimal fondsReelsUSD);

            if (htgValide)
            {
                _cloture.FondsReelsHTG = fondsReelsHTG;
                decimal ecartHTG = _cloture.EcartHTG;
                
                EcartHTGText.Text = $"{ecartHTG:N2} HTG";
                EcartHTGBorder.Visibility = Visibility.Visible;
                
                // Colorer selon l'écart
                if (Math.Abs(ecartHTG) <= _toleranceEcart)
                {
                    EcartHTGText.Foreground = new SolidColorBrush(Colors.Green);
                    EcartHTGBorder.Background = new SolidColorBrush(Colors.LightGreen);
                }
                else
                {
                    EcartHTGText.Foreground = new SolidColorBrush(Colors.Red);
                    EcartHTGBorder.Background = new SolidColorBrush(Colors.MistyRose);
                    JustificationPanel.Visibility = Visibility.Visible;
                    ValidationSuperviseurPanel.Visibility = Visibility.Visible;
                }
            }

            if (usdValide)
            {
                _cloture.FondsReelsUSD = fondsReelsUSD;
                decimal ecartUSD = _cloture.EcartUSD;
                
                EcartUSDText.Text = $"{ecartUSD:N2} USD";
                EcartUSDBorder.Visibility = Visibility.Visible;
                
                // Colorer selon l'écart (tolérance: 5 USD)
                if (Math.Abs(ecartUSD) <= 5)
                {
                    EcartUSDText.Foreground = new SolidColorBrush(Colors.Green);
                    EcartUSDBorder.Background = new SolidColorBrush(Colors.LightGreen);
                }
                else
                {
                    EcartUSDText.Foreground = new SolidColorBrush(Colors.Red);
                    EcartUSDBorder.Background = new SolidColorBrush(Colors.MistyRose);
                    JustificationPanel.Visibility = Visibility.Visible;
                    ValidationSuperviseurPanel.Visibility = Visibility.Visible;
                }
            }

            MettreAJourValidation();
        }

        private void ValidationCaissier_Checked(object sender, RoutedEventArgs e)
        {
            _cloture.ValidationCaissier = ValidationCaissierCheckBox.IsChecked == true &&
                                         ComptageVerifieCheckBox.IsChecked == true &&
                                         DocumentsArchivesCheckBox.IsChecked == true;
            MettreAJourValidation();
        }

        private void ValidationCaissier_Unchecked(object sender, RoutedEventArgs e)
        {
            _cloture.ValidationCaissier = false;
            MettreAJourValidation();
        }

        private void ValidationSuperviseur_Checked(object sender, RoutedEventArgs e)
        {
            _cloture.ValidationSuperviseur = ValidationSuperviseurCheckBox.IsChecked == true;
            _cloture.SuperviseurNom = SuperviseurNomTextBox.Text.Trim();
            MettreAJourValidation();
        }

        private void ValidationSuperviseur_Unchecked(object sender, RoutedEventArgs e)
        {
            _cloture.ValidationSuperviseur = false;
            MettreAJourValidation();
        }

        private void MettreAJourValidation()
        {
            bool peutCloturer = _verificationsTerminees &&
                               _cloture.ValidationCaissier &&
                               (_cloture.PeutCloturer || _cloture.ValidationSuperviseur) &&
                               !string.IsNullOrEmpty(FondsReelsHTGTextBox.Text) &&
                               !string.IsNullOrEmpty(FondsReelsUSDTextBox.Text);

            ValiderClotureButton.IsEnabled = peutCloturer;
            GenererBordereauButton.IsEnabled = peutCloturer;

            if (peutCloturer)
            {
                ValiderClotureButton.Background = new SolidColorBrush(Color.FromRgb(220, 38, 38));
            }
        }

        private void GenererBordereau_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                string bordereau = GenererBordereauCloture();
                
                MessageBox.Show("Bordereau de clôture généré!\n\nContenu:\n\n" + bordereau, 
                    "Bordereau de Clôture", MessageBoxButton.OK, MessageBoxImage.Information);

            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de la génération: {ex.Message}", "Erreur", 
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private string GenererBordereauCloture()
        {
            return $@"
═══════════════════════════════════════
            NALA KREDI TI MACHANN
       BORDEREAU DE CLÔTURE
═══════════════════════════════════════

Date: {DateTime.Now:dd/MM/yyyy}
Caisse: {_cloture.NumeroCaisse}
Caissier: {_cloture.Caissier}
Session: {_cloture.HeureDebut:HH:mm} - {_cloture.HeureFin:HH:mm}

───────────────────────────────────────
RÉSUMÉ DE LA JOURNÉE
───────────────────────────────────────
Transactions traitées: {_cloture.NombreTransactions}
Commissions générées: {_cloture.TotalCommissions:N2} HTG

───────────────────────────────────────
MOUVEMENTS HTG
───────────────────────────────────────
Solde d'ouverture:     {_cloture.SoldeOuvertureHTG:N2}
+ Dépôts:              {_cloture.TotalDepotsHTG:N2}
- Retraits:            {_cloture.TotalRetraitsHTG:N2}
± Changes nets:        {_cloture.TotalChangeHTG:N2}
───────────────────────────────────────
THÉORIQUE:             {_cloture.FondsTheoriquesHTG:N2}
COMPTÉ:                {_cloture.FondsReelsHTG:N2}
ÉCART:                 {_cloture.EcartHTG:N2}

───────────────────────────────────────
MOUVEMENTS USD
───────────────────────────────────────
Solde d'ouverture:     {_cloture.SoldeOuvertureUSD:N2}
+ Dépôts:              {_cloture.TotalDepotsUSD:N2}
- Retraits:            {_cloture.TotalRetraitsUSD:N2}
± Changes nets:        {_cloture.TotalChangeUSD:N2}
───────────────────────────────────────
THÉORIQUE:             {_cloture.FondsTheoriquesUSD:N2}
COMPTÉ:                {_cloture.FondsReelsUSD:N2}
ÉCART:                 {_cloture.EcartUSD:N2}

───────────────────────────────────────
VALIDATIONS
───────────────────────────────────────
Caissier:              ✓ {_cloture.Caissier}
{(_cloture.ValidationSuperviseur ? $"Superviseur:           ✓ {_cloture.SuperviseurNom}" : "")}
{(!string.IsNullOrEmpty(_cloture.MotifEcart) ? $"Justification écarts:   {_cloture.MotifEcart}" : "")}

───────────────────────────────────────
Heure de clôture: {DateTime.Now:dd/MM/yyyy HH:mm:ss}
═══════════════════════════════════════";
        }

        private void ValiderCloture_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Validation finale
                var result = MessageBox.Show(
                    $"ATTENTION: Cette action est irréversible!\n\n" +
                    $"Confirmez-vous la clôture définitive de la caisse?\n\n" +
                    $"Écart HTG: {_cloture.EcartHTG:N2}\n" +
                    $"Écart USD: {_cloture.EcartUSD:N2}", 
                    "Confirmation de Clôture", 
                    MessageBoxButton.YesNo, 
                    MessageBoxImage.Warning);

                if (result == MessageBoxResult.Yes)
                {
                    // Finaliser la clôture
                    _cloture.Statut = StatutTransaction.Validee;
                    _cloture.MotifEcart = MotifEcartTextBox.Text.Trim();
                    
                    // Simulation de la sauvegarde
                    MessageBox.Show(
                        $"✅ Clôture de caisse validée avec succès!\n\n" +
                        $"Numéro de clôture: {_cloture.NumeroOperation}\n" +
                        $"Date/Heure: {_cloture.DateOperation:dd/MM/yyyy HH:mm}\n" +
                        $"Caissier: {_cloture.Caissier}\n" +
                        $"{(_cloture.ValidationSuperviseur ? $"Superviseur: {_cloture.SuperviseurNom}" : "")}\n\n" +
                        $"La caisse est maintenant fermée.\n" +
                        $"Le bordereau de clôture a été archivé.", 
                        "Clôture Terminée", 
                        MessageBoxButton.OK, 
                        MessageBoxImage.Information);

                    // Fermer la fenêtre
                    this.DialogResult = true;
                    this.Close();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de la clôture: {ex.Message}", "Erreur", 
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void Annuler_Click(object sender, RoutedEventArgs e)
        {
            var result = MessageBox.Show("Êtes-vous sûr de vouloir annuler la clôture?", 
                "Confirmation", MessageBoxButton.YesNo, MessageBoxImage.Question);

            if (result == MessageBoxResult.Yes)
            {
                this.DialogResult = false;
                this.Close();
            }
        }

        protected override void OnClosed(EventArgs e)
        {
            _verificationTimer?.Stop();
            base.OnClosed(e);
        }
    }
}