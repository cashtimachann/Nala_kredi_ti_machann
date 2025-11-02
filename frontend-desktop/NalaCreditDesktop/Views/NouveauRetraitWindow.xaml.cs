using System;
using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using NalaCreditDesktop.Models;

namespace NalaCreditDesktop.Views
{
    public partial class NouveauRetraitWindow : Window
    {
        private RetraitModel _retrait;
        private ClientModel? _clientActuel;
        private decimal _tauxUSDVersHTG = 130.0m;
        private decimal _limiteRetraitHTG = 50000m;
        private decimal _seuilSignatureHTG = 25000m;

        public NouveauRetraitWindow()
        {
            InitializeComponent();
            InitialiserOperation();
        }

        private void InitialiserOperation()
        {
            _retrait = new RetraitModel();
            
            // Afficher les informations par défaut
            NumeroOperationText.Text = _retrait.NumeroOperation;
            DateHeureText.Text = _retrait.DateOperation.ToString("dd/MM/yyyy HH:mm");
            CaissierText.Text = _retrait.Caissier;
            
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

            // Simuler la recherche du client
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
            // Simulation de données client
            _clientActuel = new ClientModel
            {
                NumeroCompte = numeroCompte,
                Nom = "PIERRE",
                Prenom = "Jean",
                Telephone = "+509 3456-7890",
                SoldeHTG = 75000.00m,
                SoldeUSD = 580.50m
            };

            _retrait.Client = _clientActuel;
            _retrait.NumeroCompte = numeroCompte;

            // Afficher les informations client
            ClientNomText.Text = $"👤 {_clientActuel.NomComplet}";
            ClientTelephoneText.Text = $"📱 {_clientActuel.Telephone}";
            SoldeHTGText.Text = $"💵 {_clientActuel.SoldeHTG:N2} HTG";
            SoldeUSDText.Text = $"💲 {_clientActuel.SoldeUSD:N2} USD";

            ClientInfoPanel.Visibility = Visibility.Visible;

            // Mettre à jour le statut de validation
            ValidationIcon.Text = "✅";
            ValidationText.Text = "Client trouvé";
            ValidationPanel.Background = new SolidColorBrush(Colors.LightGreen);
            ValidationPanel.BorderBrush = new SolidColorBrush(Colors.Green);

            MettreAJourValidation();
            MettreAJourVerificationSolde();
        }

        private void Montant_TextChanged(object sender, TextChangedEventArgs e)
        {
            if (decimal.TryParse(MontantTextBox.Text, out decimal montant) && montant > 0)
            {
                _retrait.Montant = montant;
                
                // Déterminer la devise sélectionnée
                string deviseSelectionnee = ((ComboBoxItem)DeviseComboBox.SelectedItem)?.Content?.ToString() ?? "HTG";
                _retrait.Devise = deviseSelectionnee == "USD" ? DeviseType.USD : DeviseType.HTG;

                MettreAJourVerifications();
                MettreAJourNouveauSolde();
            }
            else
            {
                NouveauSoldeText.Text = "";
                ReinitialiserVerifications();
            }

            MettreAJourValidation();
        }

        private void Devise_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (MontantTextBox != null && decimal.TryParse(MontantTextBox.Text, out decimal montant) && montant > 0)
            {
                string deviseSelectionnee = ((ComboBoxItem)DeviseComboBox.SelectedItem)?.Content?.ToString() ?? "HTG";
                _retrait.Devise = deviseSelectionnee == "USD" ? DeviseType.USD : DeviseType.HTG;

                MettreAJourVerifications();
                MettreAJourNouveauSolde();
                MettreAJourValidation();
            }
        }

        private void MettreAJourVerifications()
        {
            if (_clientActuel == null) return;

            MettreAJourVerificationSolde();
            MettreAJourVerificationLimite();
            MettreAJourSignatureRequise();
        }

        private void MettreAJourVerificationSolde()
        {
            if (_clientActuel == null) return;

            bool soldeOK = false;
            decimal soldeDisponible = 0;

            if (_retrait.Devise == DeviseType.HTG)
            {
                soldeDisponible = _clientActuel.SoldeHTG;
                soldeOK = _clientActuel.SoldeHTG >= _retrait.Montant;
            }
            else
            {
                soldeDisponible = _clientActuel.SoldeUSD;
                soldeOK = _clientActuel.SoldeUSD >= _retrait.Montant;
            }

            _retrait.SoldeDisponible = soldeDisponible;

            if (soldeOK)
            {
                SoldeIcon.Text = "✅";
                SoldeStatusText.Text = $"Solde suffisant ({soldeDisponible:N2} {_retrait.Devise})";
                VerificationSoldePanel.Background = new SolidColorBrush(Colors.LightGreen);
                VerificationSoldePanel.BorderBrush = new SolidColorBrush(Colors.Green);
            }
            else
            {
                SoldeIcon.Text = "❌";
                SoldeStatusText.Text = $"Solde insuffisant ({soldeDisponible:N2} {_retrait.Devise})";
                VerificationSoldePanel.Background = new SolidColorBrush(Colors.MistyRose);
                VerificationSoldePanel.BorderBrush = new SolidColorBrush(Colors.Red);
            }
        }

        private void MettreAJourVerificationLimite()
        {
            decimal limiteEnDevise = _retrait.Devise == DeviseType.USD ? 
                _limiteRetraitHTG / _tauxUSDVersHTG : _limiteRetraitHTG;

            bool limiteOK = _retrait.Montant <= limiteEnDevise;
            _retrait.LimiteRetrait = limiteEnDevise;

            if (limiteOK)
            {
                LimiteIcon.Text = "✅";
                LimiteStatusText.Text = $"Limite respectée ({limiteEnDevise:N2} {_retrait.Devise}/jour)";
                VerificationLimitePanel.Background = new SolidColorBrush(Colors.LightGreen);
                VerificationLimitePanel.BorderBrush = new SolidColorBrush(Colors.Green);
            }
            else
            {
                LimiteIcon.Text = "❌";
                LimiteStatusText.Text = $"Limite dépassée ({limiteEnDevise:N2} {_retrait.Devise}/jour)";
                VerificationLimitePanel.Background = new SolidColorBrush(Colors.MistyRose);
                VerificationLimitePanel.BorderBrush = new SolidColorBrush(Colors.Red);
            }
        }

        private void MettreAJourSignatureRequise()
        {
            decimal seuilEnDevise = _retrait.Devise == DeviseType.USD ? 
                _seuilSignatureHTG / _tauxUSDVersHTG : _seuilSignatureHTG;

            bool signatureRequise = _retrait.Montant >= seuilEnDevise;
            _retrait.SignatureRequise = signatureRequise;

            if (signatureRequise)
            {
                SignaturePanel.Visibility = Visibility.Visible;
            }
            else
            {
                SignaturePanel.Visibility = Visibility.Collapsed;
                _retrait.AutorisationSuperviseur = false;
            }
        }

        private void ReinitialiserVerifications()
        {
            SoldeIcon.Text = "⚠️";
            SoldeStatusText.Text = "En attente de vérification";
            VerificationSoldePanel.Background = new SolidColorBrush(Color.FromRgb(254, 243, 199));
            VerificationSoldePanel.BorderBrush = new SolidColorBrush(Color.FromRgb(245, 158, 11));

            LimiteIcon.Text = "⚠️";
            LimiteStatusText.Text = "Limite: 50,000 HTG/jour";
            VerificationLimitePanel.Background = new SolidColorBrush(Color.FromRgb(254, 243, 199));
            VerificationLimitePanel.BorderBrush = new SolidColorBrush(Color.FromRgb(245, 158, 11));

            SignaturePanel.Visibility = Visibility.Collapsed;
        }

        private void MettreAJourNouveauSolde()
        {
            if (_clientActuel == null) return;

            decimal nouveauSolde = 0;
            string devise = "";

            if (_retrait.Devise == DeviseType.HTG)
            {
                nouveauSolde = _clientActuel.SoldeHTG - _retrait.Montant;
                devise = "HTG";
            }
            else
            {
                nouveauSolde = _clientActuel.SoldeUSD - _retrait.Montant;
                devise = "USD";
            }

            NouveauSoldeText.Text = $"{nouveauSolde:N2} {devise}";
        }

        private void Signature_Checked(object sender, RoutedEventArgs e)
        {
            _retrait.AutorisationSuperviseur = true;
            MettreAJourValidation();
        }

        private void Signature_Unchecked(object sender, RoutedEventArgs e)
        {
            _retrait.AutorisationSuperviseur = false;
            MettreAJourValidation();
        }

        private void MettreAJourValidation()
        {
            bool peutValider = _clientActuel != null && 
                              _retrait.Montant > 0 && 
                              _retrait.VerificationSolde &&
                              _retrait.RespecteLimite &&
                              (!_retrait.SignatureRequise || _retrait.AutorisationSuperviseur) &&
                              !string.IsNullOrEmpty(NumeroCompteTextBox.Text);

            ValiderRetraitButton.IsEnabled = peutValider;
            
            if (peutValider)
            {
                ValiderRetraitButton.Background = new SolidColorBrush(Color.FromRgb(239, 68, 68));
            }
        }

        private void ValiderRetrait_Click(object sender, RoutedEventArgs e)
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

                if (!_retrait.VerificationSolde)
                {
                    MessageBox.Show("Solde insuffisant pour cette opération.", "Erreur", 
                        MessageBoxButton.OK, MessageBoxImage.Error);
                    return;
                }

                if (!_retrait.RespecteLimite)
                {
                    MessageBox.Show("Montant dépasse la limite de retrait journalière.", "Erreur", 
                        MessageBoxButton.OK, MessageBoxImage.Error);
                    return;
                }

                if (_retrait.SignatureRequise && !_retrait.AutorisationSuperviseur)
                {
                    MessageBox.Show("Signature requise pour ce montant.", "Erreur", 
                        MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                // Finaliser l'opération
                _retrait.Statut = StatutTransaction.Validee;
                _retrait.MotifRetrait = MotifTextBox.Text.Trim();

                // Mettre à jour le solde client (simulation)
                if (_retrait.Devise == DeviseType.HTG)
                {
                    _clientActuel.SoldeHTG -= _retrait.Montant;
                }
                else
                {
                    _clientActuel.SoldeUSD -= _retrait.Montant;
                }

                // Afficher confirmation
                string message = $"Retrait validé avec succès!\n\n" +
                               $"Opération: {_retrait.NumeroOperation}\n" +
                               $"Client: {_clientActuel.NomComplet}\n" +
                               $"Montant: {_retrait.Montant:N2} {_retrait.Devise}\n" +
                               $"Nouveau solde: {NouveauSoldeText.Text}";

                if (_retrait.SignatureRequise)
                {
                    message += "\n\n⚠️ Signature obtenue et validée";
                }

                MessageBox.Show(message, "Retrait Validé", 
                    MessageBoxButton.OK, MessageBoxImage.Information);

                // Activer l'impression du reçu
                ImprimerReçuButton.IsEnabled = true;
                ValiderRetraitButton.IsEnabled = false;
                ValiderRetraitButton.Content = "✅ Retrait Validé";

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

                _retrait.ReçuImprime = true;
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
        REÇU DE RETRAIT
═══════════════════════════════════════

Opération: {_retrait.NumeroOperation}
Date: {_retrait.DateOperation:dd/MM/yyyy HH:mm}
Caisse: {_retrait.NumeroCaisse}
Caissier: {_retrait.Caissier}

───────────────────────────────────────
CLIENT
───────────────────────────────────────
Compte: {_clientActuel?.NumeroCompte}
Nom: {_clientActuel?.NomComplet}
Téléphone: {_clientActuel?.Telephone}

───────────────────────────────────────
RETRAIT
───────────────────────────────────────
Montant: {_retrait.Montant:N2} {_retrait.Devise}
{(_retrait.SignatureRequise ? "⚠️ Signature validée" : "")}

Nouveau solde: {NouveauSoldeText.Text}

{(!string.IsNullOrEmpty(_retrait.MotifRetrait) ? $"Motif: {_retrait.MotifRetrait}" : "")}

───────────────────────────────────────
Merci de votre confiance!
═══════════════════════════════════════";
        }

        private void Annuler_Click(object sender, RoutedEventArgs e)
        {
            if (_retrait.Statut == StatutTransaction.Validee)
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