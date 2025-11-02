using System;
using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using NalaCreditDesktop.Models;

namespace NalaCreditDesktop.Views
{
    public partial class OperationChangeWindow : Window
    {
        private ChangeModel _change;
        private TauxChangeModel _taux;
        private decimal _totalChangeJour = 0;

        public OperationChangeWindow()
        {
            InitializeComponent();
            Loaded += OperationChangeWindow_Loaded;
        }

        private void OperationChangeWindow_Loaded(object sender, RoutedEventArgs e)
        {
            InitialiserOperation();
        }

        private void InitialiserOperation()
        {
            _change = new ChangeModel();
            _taux = new TauxChangeModel();
            
            // Afficher les informations par défaut
            if (NumeroOperationText != null)
                NumeroOperationText.Text = _change.NumeroOperation;
            if (DateHeureText != null)
                DateHeureText.Text = _change.DateOperation.ToString("dd/MM/yyyy HH:mm");
            if (CaissierText != null)
                CaissierText.Text = _change.Caissier;
            if (DerniereMiseAJourText != null)
                DerniereMiseAJourText.Text = _taux.DerniereMiseAJour.ToString("dd/MM/yyyy HH:mm");
            
            // Afficher les taux
            if (TauxAcheteurText != null)
                TauxAcheteurText.Text = $"{_taux.TauxAcheteur:N2} HTG";
            if (TauxVendeurText != null)
                TauxVendeurText.Text = $"{_taux.TauxVendeur:N2} HTG";
            
            // Initialiser les totaux journaliers
            if (TotalChangeJourText != null)
                TotalChangeJourText.Text = $"{_totalChangeJour:N2} USD";
            
            // Focus sur le nom du client
            if (NomClientTextBox != null)
                NomClientTextBox.Focus();
        }

        private void VerifierIdentite(object sender, TextChangedEventArgs e)
        {
            if (NomClientTextBox == null || NumeroIdentiteTextBox == null) return;
            MettreAJourValidationIdentite();
        }

        private void MettreAJourValidationIdentite()
        {
            bool identiteValide = !string.IsNullOrWhiteSpace(NomClientTextBox.Text) &&
                                 !string.IsNullOrWhiteSpace(NumeroIdentiteTextBox.Text) &&
                                 NomClientTextBox.Text.Length >= 3 &&
                                 NumeroIdentiteTextBox.Text.Length >= 8;

            if (identiteValide)
            {
                _change.NomClient = NomClientTextBox.Text.Trim();
                _change.NumeroIdentite = NumeroIdentiteTextBox.Text.Trim();
                _change.TypePiece = ((ComboBoxItem)TypePieceComboBox.SelectedItem)?.Content?.ToString() ?? "CIN";
                _change.JustificatifValide = true;

                IdentiteIcon.Text = "✅";
                IdentiteStatusText.Text = "Identité validée";
                VerificationIdentitePanel.Background = new SolidColorBrush(Colors.LightGreen);
                VerificationIdentitePanel.BorderBrush = new SolidColorBrush(Colors.Green);

                ResumeBénéficiaireText.Text = _change.NomClient;
            }
            else
            {
                _change.JustificatifValide = false;
                
                IdentiteIcon.Text = "⚠️";
                IdentiteStatusText.Text = "Vérification en attente";
                VerificationIdentitePanel.Background = new SolidColorBrush(Color.FromRgb(254, 243, 199));
                VerificationIdentitePanel.BorderBrush = new SolidColorBrush(Color.FromRgb(245, 158, 11));

                ResumeBénéficiaireText.Text = "";
            }

            MettreAJourValidationGlobale();
        }

        private void DeviseSource_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            MettreAJourDevises();
            CalculerMontants();
        }

        private void DeviseDestination_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            MettreAJourDevises();
            CalculerMontants();
        }

        private void MettreAJourDevises()
        {
            string deviseSource = ((ComboBoxItem)DeviseSourceComboBox.SelectedItem)?.Content?.ToString() ?? "USD";
            string deviseDestination = ((ComboBoxItem)DeviseDestinationComboBox.SelectedItem)?.Content?.ToString() ?? "HTG";

            _change.DeviseSource = deviseSource == "USD" ? DeviseType.USD : DeviseType.HTG;
            _change.DeviseDestination = deviseDestination == "USD" ? DeviseType.USD : DeviseType.HTG;

            // Vérifier que les devises sont différentes
            if (_change.DeviseSource == _change.DeviseDestination)
            {
                MessageBox.Show("Les devises source et destination doivent être différentes.", 
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Warning);
                
                // Corriger automatiquement
                if (_change.DeviseSource == DeviseType.USD)
                {
                    DeviseDestinationComboBox.SelectedIndex = 0; // HTG
                }
                else
                {
                    DeviseDestinationComboBox.SelectedIndex = 1; // USD
                }
                return;
            }

            // Mettre à jour le taux affiché
            MettreAJourTauxApplique();
        }

        private void MettreAJourTauxApplique()
        {
            if (_change.DeviseSource == DeviseType.USD && _change.DeviseDestination == DeviseType.HTG)
            {
                // USD vers HTG - utiliser taux acheteur (nous achetons les USD du client)
                _change.TauxApplique = _taux.TauxAcheteur;
                TauxApliqueText.Text = $"Taux acheteur: {_taux.TauxAcheteur:N2} HTG";
                TauxApliqueText.Foreground = new SolidColorBrush(Color.FromRgb(5, 150, 105));
            }
            else if (_change.DeviseSource == DeviseType.HTG && _change.DeviseDestination == DeviseType.USD)
            {
                // HTG vers USD - utiliser taux vendeur (nous vendons des USD au client)
                _change.TauxApplique = _taux.TauxVendeur;
                TauxApliqueText.Text = $"Taux vendeur: {_taux.TauxVendeur:N2} HTG";
                TauxApliqueText.Foreground = new SolidColorBrush(Color.FromRgb(217, 119, 6));
            }
        }

        private void MontantSource_TextChanged(object sender, TextChangedEventArgs e)
        {
            CalculerMontants();
        }

        private void CalculerMontants()
        {
            if (!decimal.TryParse(MontantSourceTextBox.Text, out decimal montantSource) || montantSource <= 0)
            {
                MontantDestinationTextBox.Text = "";
                EquivalentText.Text = "";
                ResumeTransactionText.Text = "";
                MettreAJourValidationGlobale();
                return;
            }

            _change.MontantSource = montantSource;

            // Calculer le montant destination
            if (_change.DeviseSource == DeviseType.USD && _change.DeviseDestination == DeviseType.HTG)
            {
                // USD vers HTG
                _change.MontantDestination = montantSource * _taux.TauxAcheteur;
                EquivalentText.Text = $"Au taux de {_taux.TauxAcheteur:N2} HTG par USD";
                ResumeTransactionText.Text = $"{montantSource:N2} USD\n→ {_change.MontantDestination:N2} HTG";
            }
            else if (_change.DeviseSource == DeviseType.HTG && _change.DeviseDestination == DeviseType.USD)
            {
                // HTG vers USD
                _change.MontantDestination = montantSource / _taux.TauxVendeur;
                EquivalentText.Text = $"Au taux de {_taux.TauxVendeur:N2} HTG par USD";
                ResumeTransactionText.Text = $"{montantSource:N2} HTG\n→ {_change.MontantDestination:N2} USD";
            }

            MontantDestinationTextBox.Text = _change.MontantDestination.ToString("N2");

            // Vérifier les limites
            VerifierLimites();
            MettreAJourValidationGlobale();
        }

        private void VerifierLimites()
        {
            // Convertir le montant en USD pour la vérification des limites
            decimal montantEnUSD = _change.DeviseDestination == DeviseType.USD ?
                _change.MontantDestination : _change.MontantSource;

            decimal nouveauTotal = _totalChangeJour + montantEnUSD;
            bool respecteLimite = nouveauTotal <= _change.LimiteJournaliere;

            if (respecteLimite)
            {
                StatutLimiteText.Text = "✅ Limite respectée";
                StatutLimiteText.Foreground = new SolidColorBrush(Color.FromRgb(5, 150, 105));
            }
            else
            {
                StatutLimiteText.Text = "❌ Limite dépassée";
                StatutLimiteText.Foreground = new SolidColorBrush(Color.FromRgb(220, 38, 38));
            }

            // Mettre à jour la propriété du modèle
            _change.TotalChangeJour = _totalChangeJour;
        }

        private void InverserDevises_Click(object sender, RoutedEventArgs e)
        {
            // Sauvegarder les sélections actuelles
            int sourceIndex = DeviseSourceComboBox.SelectedIndex;
            int destinationIndex = DeviseDestinationComboBox.SelectedIndex;

            // Inverser
            DeviseSourceComboBox.SelectedIndex = destinationIndex;
            DeviseDestinationComboBox.SelectedIndex = sourceIndex;

            // Effacer les montants pour forcer un nouveau calcul
            string montantDestination = MontantDestinationTextBox.Text;
            MontantSourceTextBox.Text = "";
            MontantSourceTextBox.Text = montantDestination;
        }

        private void MettreAJourValidationGlobale()
        {
            bool peutValider = _change.JustificatifValide &&
                              _change.MontantSource > 0 &&
                              _change.RespecteLimite &&
                              !string.IsNullOrEmpty(NomClientTextBox.Text) &&
                              !string.IsNullOrEmpty(NumeroIdentiteTextBox.Text);

            ValiderChangeButton.IsEnabled = peutValider;
            
            if (peutValider)
            {
                ValiderChangeButton.Background = new SolidColorBrush(Color.FromRgb(59, 130, 246));
            }
        }

        private void ValiderChange_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Validation finale
                if (!_change.JustificatifValide)
                {
                    MessageBox.Show("Vérification d'identité requise.", "Erreur", 
                        MessageBoxButton.OK, MessageBoxImage.Error);
                    return;
                }

                if (!_change.RespecteLimite)
                {
                    MessageBox.Show("Le montant dépasse la limite journalière autorisée.", "Erreur", 
                        MessageBoxButton.OK, MessageBoxImage.Error);
                    return;
                }

                // Finaliser l'opération
                _change.Statut = StatutTransaction.Validee;

                // Mettre à jour le total journalier
                decimal montantEnUSD = _change.DeviseDestination == DeviseType.USD ? 
                    _change.MontantDestination : _change.MontantSource;
                _totalChangeJour += montantEnUSD;
                TotalChangeJourText.Text = $"{_totalChangeJour:N2} USD";

                // Afficher confirmation
                string message = $"Opération de change validée avec succès!\n\n" +
                               $"Opération: {_change.NumeroOperation}\n" +
                               $"Client: {_change.NomClient}\n" +
                               $"Pièce d'identité: {_change.TypePiece} - {_change.NumeroIdentite}\n\n" +
                               $"Change effectué:\n" +
                               $"{_change.MontantSource:N2} {_change.DeviseSource} → {_change.MontantDestination:N2} {_change.DeviseDestination}\n" +
                               $"Taux appliqué: {_change.TauxApplique:N2} HTG par USD";

                MessageBox.Show(message, "Change Validé", 
                    MessageBoxButton.OK, MessageBoxImage.Information);

                // Activer l'impression du justificatif
                ImprimerJustificatifButton.IsEnabled = true;
                ValiderChangeButton.IsEnabled = false;
                ValiderChangeButton.Content = "✅ Change Validé";

            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de la validation: {ex.Message}", "Erreur", 
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void ImprimerJustificatif_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Simulation d'impression de justificatif
                string justificatif = GenererJustificatif();
                
                MessageBox.Show("Justificatif envoyé à l'imprimante!\n\nContenu du justificatif:\n\n" + justificatif, 
                    "Impression Justificatif", MessageBoxButton.OK, MessageBoxImage.Information);

                ImprimerJustificatifButton.Content = "✅ Justificatif Imprimé";
                ImprimerJustificatifButton.IsEnabled = false;

            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'impression: {ex.Message}", "Erreur", 
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private string GenererJustificatif()
        {
            return $@"
═══════════════════════════════════════
            NALA KREDI
      JUSTIFICATIF DE CHANGE
═══════════════════════════════════════

Opération: {_change.NumeroOperation}
Date: {_change.DateOperation:dd/MM/yyyy HH:mm}
Caisse: {_change.NumeroCaisse}
Caissier: {_change.Caissier}

───────────────────────────────────────
CLIENT
───────────────────────────────────────
Nom: {_change.NomClient}
Pièce d'identité: {_change.TypePiece}
Numéro: {_change.NumeroIdentite}

───────────────────────────────────────
OPÉRATION DE CHANGE
───────────────────────────────────────
Montant donné: {_change.MontantSource:N2} {_change.DeviseSource}
Montant reçu: {_change.MontantDestination:N2} {_change.DeviseDestination}
Taux appliqué: {_change.TauxApplique:N2} HTG par USD

───────────────────────────────────────
TAUX DU JOUR
───────────────────────────────────────
Taux acheteur: {_taux.TauxAcheteur:N2} HTG
Taux vendeur: {_taux.TauxVendeur:N2} HTG
Source: {_taux.Source}

───────────────────────────────────────
Ce justificatif fait foi de l'opération
═══════════════════════════════════════";
        }

        private void Annuler_Click(object sender, RoutedEventArgs e)
        {
            if (_change.Statut == StatutTransaction.Validee)
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