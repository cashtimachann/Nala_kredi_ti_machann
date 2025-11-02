using System;
using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using NalaCreditDesktop.Models;

namespace NalaCreditDesktop.Views
{
    public partial class NouveauDepotWindow : Window
    {
        private DepotModel _depot;
        private ClientModel? _clientActuel;
        private decimal _tauxUSDVersHTG = 130.0m;

        public NouveauDepotWindow()
        {
            InitializeComponent();
            InitialiserOperation();
        }

        private void InitialiserOperation()
        {
            _depot = new DepotModel();
            
            // Afficher les informations par défaut
            NumeroOperationText.Text = _depot.NumeroOperation;
            DateHeureText.Text = _depot.DateOperation.ToString("dd/MM/yyyy HH:mm");
            CaissierText.Text = _depot.Caissier;
            
            // Focus sur le champ numéro de compte
            NumeroCompteTextBox.Focus();
        }

        private void NumeroCompte_TextChanged(object sender, TextChangedEventArgs e)
        {
            string numeroCompte = NumeroCompteTextBox.Text.Trim();
            
            if (string.IsNullOrEmpty(numeroCompte))
            {
                ClientInfoPanel.Visibility = Visibility.Collapsed;
                MettreAJourValidation();
                return;
            }

            // Simuler la recherche du client (à remplacer par un vrai service)
            if (numeroCompte.Length >= 6)
            {
                SimulerRechercheClient(numeroCompte);
            }
        }

        private void RechercherClient_Click(object sender, RoutedEventArgs e)
        {
            string numeroCompte = NumeroCompteTextBox.Text.Trim();
            
            if (string.IsNullOrEmpty(numeroCompte))
            {
                MessageBox.Show("Veuillez saisir un numéro de compte.", "Recherche Client", 
                    MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            SimulerRechercheClient(numeroCompte);
        }

        private void SimulerRechercheClient(string numeroCompte)
        {
            // Simulation de données client (à remplacer par un vrai service)
            _clientActuel = new ClientModel
            {
                NumeroCompte = numeroCompte,
                Nom = "PIERRE",
                Prenom = "Jean",
                Telephone = "+509 3456-7890",
                SoldeHTG = 25000.00m,
                SoldeUSD = 180.50m
            };

            _depot.Client = _clientActuel;
            _depot.NumeroCompte = numeroCompte;

            // Afficher les informations client
            ClientNomText.Text = $"👤 {_clientActuel.NomComplet}";
            ClientTelephoneText.Text = $"📱 {_clientActuel.Telephone}";
            SoldeHTGText.Text = $"💵 {_clientActuel.SoldeHTG:N2} HTG";
            SoldeUSDText.Text = $"💲 {_clientActuel.SoldeUSD:N2} USD";

            ClientInfoPanel.Visibility = Visibility.Visible;

            // Mettre à jour le statut de validation
            ValidationIcon.Text = "✅";
            ValidationText.Text = "Client trouvé";
            ValidationPanel.Background = System.Windows.Media.Brushes.LightGreen;
            ValidationPanel.BorderBrush = System.Windows.Media.Brushes.Green;

            MettreAJourValidation();
        }

        private void Montant_TextChanged(object sender, TextChangedEventArgs e)
        {
            if (decimal.TryParse(MontantTextBox.Text, out decimal montant) && montant > 0)
            {
                _depot.Montant = montant;
                
                // Déterminer la devise sélectionnée
                string deviseSelectionnee = ((ComboBoxItem)DeviseComboBox.SelectedItem)?.Content?.ToString() ?? "HTG";
                _depot.Devise = deviseSelectionnee == "USD" ? DeviseType.USD : DeviseType.HTG;

                CalculerConversion();
                MettreAJourNouveauSolde();
            }
            else
            {
                ConversionPanel.Visibility = Visibility.Collapsed;
                NouveauSoldeText.Text = "";
            }

            MettreAJourValidation();
        }

        private void Devise_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (MontantTextBox != null && decimal.TryParse(MontantTextBox.Text, out decimal montant))
            {
                string deviseSelectionnee = ((ComboBoxItem)DeviseComboBox.SelectedItem)?.Content?.ToString() ?? "HTG";
                _depot.Devise = deviseSelectionnee == "USD" ? DeviseType.USD : DeviseType.HTG;

                CalculerConversion();
                MettreAJourNouveauSolde();
            }
        }

        private void CalculerConversion()
        {
            if (_depot.Devise == DeviseType.USD)
            {
                // Conversion USD vers HTG pour affichage
                _depot.TauxConversion = _tauxUSDVersHTG;
                _depot.MontantConverti = _depot.Montant * _tauxUSDVersHTG;
                
                TauxConversionText.Text = $"1 USD = {_tauxUSDVersHTG:N2} HTG";
                MontantConvertiText.Text = $"{_depot.MontantConverti:N2} HTG";
                
                ConversionPanel.Visibility = Visibility.Visible;
            }
            else if (_depot.Devise == DeviseType.HTG)
            {
                // Conversion HTG vers USD pour information
                _depot.TauxConversion = 1 / _tauxUSDVersHTG;
                _depot.MontantConverti = _depot.Montant / _tauxUSDVersHTG;
                
                TauxConversionText.Text = $"1 HTG = {_depot.TauxConversion:F4} USD";
                MontantConvertiText.Text = $"{_depot.MontantConverti:N2} USD";
                
                ConversionPanel.Visibility = Visibility.Visible;
            }
        }

        private void MettreAJourNouveauSolde()
        {
            if (_clientActuel == null) return;

            decimal nouveauSolde = 0;
            string devise = "";

            if (_depot.Devise == DeviseType.HTG)
            {
                nouveauSolde = _clientActuel.SoldeHTG + _depot.Montant;
                devise = "HTG";
            }
            else
            {
                nouveauSolde = _clientActuel.SoldeUSD + _depot.Montant;
                devise = "USD";
            }

            NouveauSoldeText.Text = $"{nouveauSolde:N2} {devise}";
        }

        private void MettreAJourValidation()
        {
            bool peutValider = _clientActuel != null && 
                              _depot.Montant > 0 && 
                              !string.IsNullOrEmpty(NumeroCompteTextBox.Text);

            ValiderDepotButton.IsEnabled = peutValider;
            
            if (peutValider)
            {
                ValiderDepotButton.Background = System.Windows.Media.Brushes.Green;
            }
        }

        private void ValiderDepot_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Validation finale
                if (_clientActuel == null)
                {
                    MessageBox.Show("Aucun client sélectionné.", "Erreur", 
                        MessageBoxButton.OK, MessageBoxImage.Error);
                    return;
                }

                if (_depot.Montant <= 0)
                {
                    MessageBox.Show("Le montant doit être supérieur à zéro.", "Erreur", 
                        MessageBoxButton.OK, MessageBoxImage.Error);
                    return;
                }

                // Finaliser l'opération
                _depot.Statut = StatutTransaction.Validee;
                _depot.SourceFonds = ((ComboBoxItem)SourceFondsComboBox.SelectedItem)?.Content?.ToString() ?? "Espèces";

                // Mettre à jour le solde client (simulation)
                if (_depot.Devise == DeviseType.HTG)
                {
                    _clientActuel.SoldeHTG += _depot.Montant;
                }
                else
                {
                    _clientActuel.SoldeUSD += _depot.Montant;
                }

                // Afficher confirmation
                string message = $"Dépôt validé avec succès!\n\n" +
                               $"Opération: {_depot.NumeroOperation}\n" +
                               $"Client: {_clientActuel.NomComplet}\n" +
                               $"Montant: {_depot.Montant:N2} {_depot.Devise}\n" +
                               $"Nouveau solde: {NouveauSoldeText.Text}";

                MessageBox.Show(message, "Dépôt Validé", 
                    MessageBoxButton.OK, MessageBoxImage.Information);

                // Activer l'impression du reçu
                ImprimerReçuButton.IsEnabled = true;
                ValiderDepotButton.IsEnabled = false;
                ValiderDepotButton.Content = "✅ Dépôt Validé";

            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de la validation: {ex.Message}", "Erreur", 
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void ImprimerReçu_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Simulation d'impression de reçu
                string reçu = GenererReçu();
                
                MessageBox.Show("Reçu envoyé à l'imprimante!\n\nContenu du reçu:\n\n" + reçu, 
                    "Impression Reçu", MessageBoxButton.OK, MessageBoxImage.Information);

                _depot.ReçuImprime = true;
                ImprimerReçuButton.Content = "✅ Reçu Imprimé";
                ImprimerReçuButton.IsEnabled = false;

            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'impression: {ex.Message}", "Erreur", 
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private string GenererReçu()
        {
            return $@"
═══════════════════════════════════════
            NALA KREDI
        REÇU DE DÉPÔT
═══════════════════════════════════════

Opération: {_depot.NumeroOperation}
Date: {_depot.DateOperation:dd/MM/yyyy HH:mm}
Caisse: {_depot.NumeroCaisse}
Caissier: {_depot.Caissier}

───────────────────────────────────────
CLIENT
───────────────────────────────────────
Compte: {_clientActuel?.NumeroCompte}
Nom: {_clientActuel?.NomComplet}
Téléphone: {_clientActuel?.Telephone}

───────────────────────────────────────
DÉPÔT
───────────────────────────────────────
Montant: {_depot.Montant:N2} {_depot.Devise}
Source: {_depot.SourceFonds}

Nouveau solde: {NouveauSoldeText.Text}

───────────────────────────────────────
Merci de votre confiance!
═══════════════════════════════════════";
        }

        private void Annuler_Click(object sender, RoutedEventArgs e)
        {
            if (_depot.Statut == StatutTransaction.Validee)
            {
                MessageBox.Show("Impossible d'annuler une opération déjà validée.", "Annulation", 
                    MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            var result = MessageBox.Show("Êtes-vous sûr de vouloir annuler cette opération?", 
                "Confirmation", MessageBoxButton.YesNo, MessageBoxImage.Question);

            if (result == MessageBoxResult.Yes)
            {
                this.DialogResult = false;
                this.Close();
            }
        }
    }
}