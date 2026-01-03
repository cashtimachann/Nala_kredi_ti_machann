using System;
using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class OperationChangeWindow : Window
    {
        private readonly ApiService _apiService;
        private ChangeModel _change = new();
        private TauxChangeModel _taux = new();
        private decimal _totalChangeJour = 0;
        private bool _operationReussie;

        public bool OperationReussie => _operationReussie;

        public OperationChangeWindow(ApiService? apiService = null)
        {
            _apiService = apiService ?? AppServices.GetRequiredApiService();
            InitializeComponent();
            Loaded += OperationChangeWindow_Loaded;
        }

        private void OperationChangeWindow_Loaded(object sender, RoutedEventArgs e)
        {
            InitialiserOperation();
            // Assurer ke direksyon devises yo matche ak seleksyon vizyèl yo
            MettreAJourDevises();
            // Charger les taux du jour depuis l'API (asynchrone, sans bloquer l'UI)
            _ = ChargerTauxDuJourAsync();
        }

        private void InitialiserOperation()
        {
            _change = new ChangeModel();
            _taux = new TauxChangeModel();
            _operationReussie = false;
            // If we have an authenticated user, use their name as caissier
            try
            {
                var user = _apiService?.CurrentUser;
                if (user != null)
                {
                    _change.Caissier = string.IsNullOrWhiteSpace(user.FirstName) ? user.Email : (string.IsNullOrWhiteSpace(user.LastName) ? user.FirstName : $"{user.FirstName} {user.LastName}");
                }
            }
            catch { }
            
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

        private async Task ChargerTauxDuJourAsync()
        {
            try
            {
                var rate = await _apiService.GetCurrentExchangeRateAsync();
                if (rate == null)
                {
                    return;
                }

                // Mettre à jour les taux appliqués
                _taux.TauxAcheteur = rate.BuyingRate; // Nous achetons USD du client
                _taux.TauxVendeur = rate.SellingRate; // Nous vendons USD au client
                _taux.DerniereMiseAJour = rate.UpdatedAt != default ? rate.UpdatedAt : rate.EffectiveDate;
                _taux.Source = "Superadmin";

                // Rafraîchir l'affichage si les contrôles existent
                if (TauxAcheteurText != null)
                    TauxAcheteurText.Text = $"{_taux.TauxAcheteur:N2} HTG";
                if (TauxVendeurText != null)
                    TauxVendeurText.Text = $"{_taux.TauxVendeur:N2} HTG";
                if (DerniereMiseAJourText != null)
                    DerniereMiseAJourText.Text = _taux.DerniereMiseAJour.ToString("dd/MM/yyyy HH:mm");

                // Mettre à jour le texte de taux appliqué selon sélection courante
                MettreAJourTauxApplique();

                // Recalculer si un montant est saisi
                CalculerMontants();
            }
            catch (Exception)
            {
                // Garder silencieux pour éviter les interruptions; l'utilisateur peut réessayer
            }
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
            if (DeviseSourceComboBox == null || DeviseDestinationComboBox == null)
            {
                // The XAML may trigger SelectionChanged before every control is connected.
                // Defer logic until both combo boxes are ready to avoid null references.
                return;
            }

            var sourceItem = DeviseSourceComboBox.SelectedItem as ComboBoxItem;
            var destinationItem = DeviseDestinationComboBox.SelectedItem as ComboBoxItem;

            string deviseSource = sourceItem?.Content?.ToString() ?? "USD";
            string deviseDestination = destinationItem?.Content?.ToString() ?? "HTG";

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
            if (TauxApliqueText == null)
            {
                return;
            }

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
            // Guard against early event firing before controls are ready
            if (MontantSourceTextBox == null || MontantDestinationTextBox == null || EquivalentText == null || ResumeTransactionText == null)
            {
                return;
            }

            if (!decimal.TryParse(MontantSourceTextBox.Text, out decimal montantSource) || montantSource <= 0)
            {
                MontantDestinationTextBox.Text = "";
                EquivalentText.Text = "";
                ResumeTransactionText.Text = "";
                MettreAJourValidationGlobale();
                return;
            }

            _change.MontantSource = montantSource;

            // Essayer calcul serveur pou enkli komisyon ak règ branch
            _ = CalculerMontantDepuisServeurAsync(montantSource);

            // Fallback lokal si API pa disponib (pa gen komisyon)
            if (_change.DeviseSource == DeviseType.USD && _change.DeviseDestination == DeviseType.HTG)
            {
                _change.MontantDestination = montantSource * _taux.TauxAcheteur;
                EquivalentText.Text = $"Au taux de {_taux.TauxAcheteur:N2} HTG par USD";
                ResumeTransactionText.Text = $"{montantSource:N2} USD\n→ {_change.MontantDestination:N2} HTG";
            }
            else if (_change.DeviseSource == DeviseType.HTG && _change.DeviseDestination == DeviseType.USD)
            {
                if (_taux.TauxVendeur <= 0)
                {
                    EquivalentText.Text = "Taux vendeur invalide";
                    ResumeTransactionText.Text = "";
                    MontantDestinationTextBox.Text = "";
                    MettreAJourValidationGlobale();
                    return;
                }
                _change.MontantDestination = montantSource / _taux.TauxVendeur;
                EquivalentText.Text = $"Au taux de {_taux.TauxVendeur:N2} HTG par USD";
                ResumeTransactionText.Text = $"{montantSource:N2} HTG\n→ {_change.MontantDestination:N2} USD";
            }

            MontantDestinationTextBox.Text = _change.MontantDestination.ToString("N2");

            // Vérifier les limites
            VerifierLimites();
            MettreAJourValidationGlobale();
        }

        private async Task CalculerMontantDepuisServeurAsync(decimal montantSource)
        {
            try
            {
                var exchangeType = (_change.DeviseSource == DeviseType.HTG && _change.DeviseDestination == DeviseType.USD)
                    ? "Purchase" // Client achte USD ak HTG
                    : "Sale";     // Client vann USD pou HTG

                var request = new ApiService.ExchangeCalculationRequest
                {
                    BranchId = null,
                    ExchangeType = exchangeType,
                    Amount = montantSource
                };

                var result = await _apiService.CalculateExchangeAsync(request);
                if (result == null || !result.IsValid)
                {
                    return; // fallback lokal deja fèt
                }

                // Mete ajou selon repons API (inclure komisyon)
                _change.TauxApplique = result.ExchangeRate;

                var isUsdToHtg = _change.DeviseSource == DeviseType.USD && _change.DeviseDestination == DeviseType.HTG;
                var deviseLabelSource = isUsdToHtg ? "USD" : "HTG";
                var deviseLabelDest = isUsdToHtg ? "HTG" : "USD";

                // Montan resevwa: net apre komisyon
                _change.MontantDestination = result.NetAmount;
                MontantDestinationTextBox.Text = result.NetAmount.ToString("N2");

                EquivalentText.Text = $"Taux: {result.ExchangeRate:N2} HTG/USD • Commission: {result.CommissionRate:P2}";
                ResumeTransactionText.Text = $"{montantSource:N2} {deviseLabelSource}\n→ {result.NetAmount:N2} {deviseLabelDest}";

                // Rafrechi bann taux aplike vizyèl
                if (TauxApliqueText != null)
                {
                    TauxApliqueText.Text = isUsdToHtg
                        ? $"Taux acheteur: {result.ExchangeRate:N2} HTG"
                        : $"Taux vendeur: {result.ExchangeRate:N2} HTG";
                }
            }
            catch
            {
                // Silans: si API echwe nou rete sou kalkil lokal
            }
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
            _change.RespecteLimite = respecteLimite;
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
            if (ValiderChangeButton == null || NomClientTextBox == null || NumeroIdentiteTextBox == null)
            {
                return;
            }

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

        private async void ValiderChange_Click(object sender, RoutedEventArgs e)
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

                // Désactiver le bouton pendant le traitement
                if (ValiderChangeButton != null)
                {
                    ValiderChangeButton.IsEnabled = false;
                    ValiderChangeButton.Content = "⏳ Traitement...";
                }

                // Poster la transaction au backend pour l'historique
                var exchangeType = (_change.DeviseSource == DeviseType.HTG && _change.DeviseDestination == DeviseType.USD)
                    ? "Purchase" // Client achte USD ak HTG
                    : "Sale";     // Client vann USD pou HTG

                // S'assurer que CustomerName n'est jamais vide ou null pour satisfaire la validation backend
                var customerName = string.IsNullOrWhiteSpace(_change.NomClient) ? "Client" : _change.NomClient.Trim();
                var customerDocument = string.IsNullOrWhiteSpace(_change.NumeroIdentite) ? "" : _change.NumeroIdentite.Trim();

                var txRequest = new ApiService.ExchangeTransactionRequest
                {
                    // Laisser le backend résoud branch via le JWT claim
                    BranchId = null,
                    ExchangeType = exchangeType,
                    Amount = _change.MontantSource,
                    CustomerName = customerName,
                    CustomerDocument = customerDocument,
                    CustomerPhone = null,
                    Notes = "Opération de change via Desktop"
                };

                var txResult = await _apiService.ProcessExchangeTransactionAsync(txRequest);
                if (!txResult.IsSuccess)
                {
                    // Réactiver le bouton et afficher l'erreur
                    if (ValiderChangeButton != null)
                    {
                        ValiderChangeButton.IsEnabled = true;
                        ValiderChangeButton.Content = "✅ Valider Change";
                    }
                    MessageBox.Show($"Erreur lors de l'enregistrement de la transaction: {txResult.ErrorMessage}", "Erreur", 
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
                _operationReussie = true;

            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de la validation: {ex.Message}", "Erreur", 
                    MessageBoxButton.OK, MessageBoxImage.Error);
                if (ValiderChangeButton != null)
                {
                    ValiderChangeButton.IsEnabled = true;
                    ValiderChangeButton.Content = "✅ Valider Change";
                }
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
            NALA KREDI TI MACHANN
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