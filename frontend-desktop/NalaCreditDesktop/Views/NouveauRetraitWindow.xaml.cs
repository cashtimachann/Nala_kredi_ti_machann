using System;
using System.ComponentModel;
using System.Globalization;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class NouveauRetraitWindow : Window
    {
        private const int MinimumAccountNumberLength = 6;
        private const decimal LimiteRetraitDefautHTG = 50_000m;
        private const decimal SeuilSignatureDefautHTG = 25_000m;
        private const decimal TauxUsdVersHtg = 130.0m;

        private static SolidColorBrush CreateBrush(byte r, byte g, byte b)
        {
            var brush = new SolidColorBrush(Color.FromRgb(r, g, b));
            brush.Freeze();
            return brush;
        }

        private static readonly SolidColorBrush PendingBackgroundBrush = CreateBrush(254, 243, 199);
        private static readonly SolidColorBrush PendingBorderBrush = CreateBrush(245, 158, 11);
        private static readonly SolidColorBrush SuccessBackgroundBrush = CreateBrush(209, 250, 229);
        private static readonly SolidColorBrush SuccessBorderBrush = CreateBrush(16, 185, 129);
        private static readonly SolidColorBrush ErrorBackgroundBrush = CreateBrush(254, 226, 226);
        private static readonly SolidColorBrush ErrorBorderBrush = CreateBrush(239, 68, 68);
        // Button background brushes for enabled/disabled primary action
        private static readonly SolidColorBrush PrimaryActionBackgroundBrush = CreateBrush(239, 68, 68);
        private static readonly SolidColorBrush PrimaryActionDisabledBrush = CreateBrush(241, 245, 249);

        private readonly ApiService _apiService;

        private RetraitModel _retrait = new();
        private ClientModel? _clientActuel;
        private SavingsAccountInfo? _accountInfo;
        private CurrentAccountInfo? _currentAccountInfo;
        private SavingsTransactionResponse? _lastTransaction;
        private CurrentAccountTransactionResponse? _lastCurrentTransaction;
        private CancellationTokenSource? _searchCts;
        private bool _isProcessing;
        private bool _operationReussie;
        private bool _isCurrentAccount;

        public bool OperationReussie => _operationReussie;

        public NouveauRetraitWindow(ApiService apiService)
        {
            InitializeComponent();
            _apiService = apiService ?? throw new ArgumentNullException(nameof(apiService));
            try
            {
                InitialiserOperation();
            }
            catch (Exception ex)
            {
                // Include stack trace to aid debugging if init fails
                MessageBox.Show($"Erè pandan inisyalizasyon fenèt retrait:\n\n{ex}", "Erè", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void InitialiserOperation()
        {
            _retrait = new RetraitModel();
            _operationReussie = false;
            _lastTransaction = null;

            // Populate cashier info from current user session when available
            try
            {
                var user = _apiService?.CurrentUser;
                if (user != null)
                {
                    var fullName = string.IsNullOrWhiteSpace(user.FirstName) ? user.Email : (string.IsNullOrWhiteSpace(user.LastName) ? user.FirstName : $"{user.FirstName} {user.LastName}");
                    _retrait.Caissier = fullName;
                }
            }
            catch
            {
                // ignore - keep model default
            }

            if (NumeroOperationText != null) NumeroOperationText.Text = _retrait.NumeroOperation;
            if (DateHeureText != null) DateHeureText.Text = _retrait.DateOperation.ToString("dd/MM/yyyy HH:mm");
            if (CaissierText != null) CaissierText.Text = _retrait.Caissier;

            if (DeviseComboBox != null)
            {
                DeviseComboBox.IsEnabled = false;
                DeviseComboBox.SelectedIndex = 0;
            }
            if (MontantTextBox != null)
            {
                MontantTextBox.IsEnabled = false;
                MontantTextBox.Text = string.Empty;
            }
            if (NouveauSoldeText != null) NouveauSoldeText.Text = string.Empty;

            if (SignaturePanel != null) SignaturePanel.Visibility = Visibility.Collapsed;
            if (SignatureCheckBox != null) SignatureCheckBox.IsChecked = false;

            if (ImprimerReçuButton != null) ImprimerReçuButton.IsEnabled = false;
            if (ValiderRetraitButton != null)
            {
                ValiderRetraitButton.IsEnabled = false;
                ValiderRetraitButton.Content = "Valider le retrait";
            }

            ResetClientInfo();
            if (NumeroCompteTextBox != null) NumeroCompteTextBox.Focus();
        }

        private void ResetClientInfo()
        {
            _clientActuel = null;
            _accountInfo = null;
            if (ClientInfoPanel != null) ClientInfoPanel.Visibility = Visibility.Collapsed;
            SetValidationPending("En attente");
            if (SoldeHTGText != null) SoldeHTGText.Text = "💵 -- HTG";
            if (SoldeUSDText != null) SoldeUSDText.Text = "💲 -- USD";
            ReinitialiserVerifications();
            MettreAJourValidation();
        }

        private async void NumeroCompte_TextChanged(object sender, TextChangedEventArgs e)
        {
            var text = NumeroCompteTextBox?.Text?.Trim() ?? string.Empty;
            await RechercheCompteAsync(text);
        }

        private async void RechercherClient_Click(object sender, RoutedEventArgs e)
        {
            var text = NumeroCompteTextBox?.Text?.Trim() ?? string.Empty;
            await RechercheCompteAsync(text, forceImmediate: true);
        }

        private async Task RechercheCompteAsync(string numeroCompte, bool forceImmediate = false)
        {
            _searchCts?.Cancel();

            if (string.IsNullOrWhiteSpace(numeroCompte))
            {
                ResetClientInfo();
                return;
            }

            if (!forceImmediate && numeroCompte.Length < MinimumAccountNumberLength)
            {
                SetValidationPending("Numéro de compte incomplet");
                _clientActuel = null;
                _accountInfo = null;
                MontantTextBox.IsEnabled = false;
                MettreAJourValidation();
                return;
            }

            var cts = new CancellationTokenSource();
            _searchCts = cts;

            try
            {
                SetValidationPending("Recherche du compte...");

                if (!forceImmediate)
                {
                    await Task.Delay(250, cts.Token);
                }

                // Try savings account first
                var savingsResult = await _apiService.GetSavingsAccountByNumberAsync(numeroCompte);
                if (cts.IsCancellationRequested)
                {
                    return;
                }

                if (savingsResult.IsSuccess && savingsResult.Data != null)
                {
                    _isCurrentAccount = false;
                    ApplyAccountInfo(savingsResult.Data);
                    return;
                }

                // Try current account if savings not found
                var currentResult = await _apiService.GetCurrentAccountByNumberAsync(numeroCompte);
                if (cts.IsCancellationRequested)
                {
                    return;
                }

                if (currentResult.IsSuccess && currentResult.Data != null)
                {
                    _isCurrentAccount = true;
                    ApplyCurrentAccountInfo(currentResult.Data);
                    return;
                }

                // Neither found
                ShowAccountNotFound(currentResult.ErrorMessage ?? savingsResult.ErrorMessage);
            }
            catch (TaskCanceledException)
            {
                // Ignored
            }
            catch (Exception ex)
            {
                if (!cts.IsCancellationRequested)
                {
                    ShowAccountNotFound(ex.Message);
                }
            }
        }

        private void ShowAccountNotFound(string? message)
        {
            _clientActuel = null;
            _accountInfo = null;
            _currentAccountInfo = null;
            if (ClientInfoPanel != null) ClientInfoPanel.Visibility = Visibility.Collapsed;
            SetValidationError(string.IsNullOrWhiteSpace(message) ? "Compte introuvable" : message);
            if (MontantTextBox != null) MontantTextBox.IsEnabled = false;
            if (MontantTextBox != null) MontantTextBox.Text = string.Empty;
            if (NouveauSoldeText != null) NouveauSoldeText.Text = string.Empty;
            ReinitialiserVerifications();
            MettreAJourValidation();
        }

        private void ApplyAccountInfo(SavingsAccountInfo account)
        {
            _accountInfo = account;
            _currentAccountInfo = null;
            _lastTransaction = null;

            var (prenom, nom) = ExtraireNomPrenom(account);
            var phone = account.Customer?.Contact?.PrimaryPhone ?? account.Customer?.Contact?.SecondaryPhone ?? string.Empty;

            _clientActuel = new ClientModel
            {
                NumeroCompte = account.AccountNumber,
                Prenom = prenom,
                Nom = nom,
                Telephone = phone,
                SoldeHTG = account.Currency == SavingsCurrency.HTG ? account.AvailableBalance : 0m,
                SoldeUSD = account.Currency == SavingsCurrency.USD ? account.AvailableBalance : 0m
            };

            _retrait.NumeroCompte = account.AccountNumber;
            _retrait.Client = _clientActuel;
            _retrait.Devise = account.Currency == SavingsCurrency.HTG ? DeviseType.HTG : DeviseType.USD;

            if (ClientNomText != null) ClientNomText.Text = $"👤 {_clientActuel.NomComplet}".Trim();
            if (ClientTelephoneText != null) ClientTelephoneText.Text = string.IsNullOrWhiteSpace(phone) ? "📱 Téléphone non disponible" : $"📱 {phone}";
            if (SoldeHTGText != null) SoldeHTGText.Text = $"💵 {_clientActuel.SoldeHTG:N2} HTG";
            if (SoldeUSDText != null) SoldeUSDText.Text = $"💲 {_clientActuel.SoldeUSD:N2} USD";

            if (ClientInfoPanel != null) ClientInfoPanel.Visibility = Visibility.Visible;
            SetValidationSuccess("Client trouvé (Compte Épargne)");

            if (DeviseComboBox != null) DeviseComboBox.SelectedIndex = account.Currency == SavingsCurrency.HTG ? 0 : 1;
            if (DeviseComboBox != null) DeviseComboBox.IsEnabled = false;
            if (MontantTextBox != null)
            {
                MontantTextBox.IsEnabled = true;
                MontantTextBox.Focus();
                MontantTextBox.SelectAll();
            }

            ReinitialiserVerifications();
            MettreAJourValidation();
        }

        private void ApplyCurrentAccountInfo(CurrentAccountInfo account)
        {
            _currentAccountInfo = account;
            _accountInfo = null;
            _lastCurrentTransaction = null;

            var customerName = account.CustomerName ?? string.Empty;
            var nameParts = customerName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var prenom = nameParts.Length > 0 ? nameParts[0] : string.Empty;
            var nom = nameParts.Length > 1 ? string.Join(" ", nameParts.Skip(1)) : string.Empty;
            var phone = account.CustomerPhone ?? string.Empty;

            var curr = ParseCurrency(account.Currency);
            _clientActuel = new ClientModel
            {
                NumeroCompte = account.AccountNumber,
                Prenom = prenom,
                Nom = nom,
                Telephone = phone,
                SoldeHTG = curr == 0 ? account.AvailableBalance : 0m,  // 0=HTG
                SoldeUSD = curr == 1 ? account.AvailableBalance : 0m   // 1=USD
            };

            _retrait.NumeroCompte = account.AccountNumber;
            _retrait.Client = _clientActuel;
            _retrait.Devise = curr == 0 ? DeviseType.HTG : DeviseType.USD;

            if (ClientNomText != null) ClientNomText.Text = $"👤 {_clientActuel.NomComplet}".Trim();
            if (ClientTelephoneText != null) ClientTelephoneText.Text = string.IsNullOrWhiteSpace(phone) ? "📱 Téléphone non disponible" : $"📱 {phone}";
            if (SoldeHTGText != null) SoldeHTGText.Text = $"💵 {_clientActuel.SoldeHTG:N2} HTG";
            if (SoldeUSDText != null) SoldeUSDText.Text = $"💲 {_clientActuel.SoldeUSD:N2} USD";

            if (ClientInfoPanel != null) ClientInfoPanel.Visibility = Visibility.Visible;
            SetValidationSuccess("Client trouvé (Compte Courant)");

            if (DeviseComboBox != null) DeviseComboBox.SelectedIndex = curr == 0 ? 0 : 1;
            if (DeviseComboBox != null) DeviseComboBox.IsEnabled = false;
            if (MontantTextBox != null)
            {
                MontantTextBox.IsEnabled = true;
                MontantTextBox.Focus();
                MontantTextBox.SelectAll();
            }

            ReinitialiserVerifications();
            MettreAJourValidation();
        }

        private static (string Prenom, string Nom) ExtraireNomPrenom(SavingsAccountInfo account)
        {
            var fullName = account.Customer?.FullName;
            if (string.IsNullOrWhiteSpace(fullName))
            {
                fullName = account.CustomerName;
            }

            if (string.IsNullOrWhiteSpace(fullName))
            {
                return (account.Customer?.FirstName ?? string.Empty, account.Customer?.LastName ?? string.Empty);
            }

            var parts = fullName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
            return parts.Length switch
            {
                0 => (string.Empty, string.Empty),
                1 => (parts[0], account.Customer?.LastName ?? string.Empty),
                _ => (parts[0], parts[1])
            };
        }

        private void Montant_TextChanged(object sender, TextChangedEventArgs e)
        {
            var montantText = MontantTextBox?.Text ?? string.Empty;
            if (!TryParseMontant(montantText, out var montant) || montant <= 0)
            {
                _retrait.Montant = 0;
                NouveauSoldeText.Text = string.Empty;
                ReinitialiserVerifications();
                MettreAJourValidation();
                return;
            }

            _retrait.Montant = montant;
            MettreAJourVerifications();
            MettreAJourNouveauSolde();
            MettreAJourValidation();
        }

        private static bool TryParseMontant(string? texte, out decimal montant)
        {
            if (decimal.TryParse(texte, NumberStyles.Number, CultureInfo.CurrentCulture, out montant))
            {
                return true;
            }

            return decimal.TryParse(texte, NumberStyles.Number, CultureInfo.InvariantCulture, out montant);
        }

        private void Devise_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            // Devise verrouillée sur la devise du compte, mais on garde la logique par sécurité.
            MettreAJourVerifications();
            MettreAJourNouveauSolde();
            MettreAJourValidation();
        }

        private void MettreAJourVerifications()
        {
            // Only reset verifications when no account is selected OR no amount provided.
            if ((_accountInfo == null && _currentAccountInfo == null) || _retrait.Montant <= 0)
            {
                ReinitialiserVerifications();
                return;
            }

            MettreAJourVerificationSolde();
            MettreAJourVerificationLimite();
            MettreAJourSignatureRequise();
        }

        private void MettreAJourVerificationSolde()
        {
            // Handle both savings and current accounts via GetCurrentAvailableBalance()
            if (_accountInfo == null && _currentAccountInfo == null)
            {
                return;
            }

            var disponible = GetCurrentAvailableBalance();
            _retrait.SoldeDisponible = disponible;
            var devise = GetDeviseCode();
            var soldeSuffisant = disponible >= _retrait.Montant;

            if (soldeSuffisant)
            {
                if (SoldeIcon != null) SoldeIcon.Text = "✅";
                if (SoldeStatusText != null) SoldeStatusText.Text = $"Solde suffisant ({disponible:N2} {devise})";
                if (VerificationSoldePanel != null)
                {
                    VerificationSoldePanel.Background = SuccessBackgroundBrush;
                    VerificationSoldePanel.BorderBrush = SuccessBorderBrush;
                }
            }
            else
            {
                if (SoldeIcon != null) SoldeIcon.Text = "❌";
                if (SoldeStatusText != null) SoldeStatusText.Text = $"Solde insuffisant ({disponible:N2} {devise})";
                if (VerificationSoldePanel != null)
                {
                    VerificationSoldePanel.Background = ErrorBackgroundBrush;
                    VerificationSoldePanel.BorderBrush = ErrorBorderBrush;
                }
            }
        }

        private void MettreAJourVerificationLimite()
        {
            // Support both account types
            if (_accountInfo == null && _currentAccountInfo == null)
            {
                return;
            }

            var devise = GetDeviseCode();
            var limite = GetDailyWithdrawalLimit();
            _retrait.LimiteRetrait = limite;
            var limiteRespectee = _retrait.Montant <= limite;

            if (limiteRespectee)
            {
                if (LimiteIcon != null) LimiteIcon.Text = "✅";
                if (LimiteStatusText != null) LimiteStatusText.Text = $"Limite respectée ({limite:N2} {devise}/jour)";
                if (VerificationLimitePanel != null)
                {
                    VerificationLimitePanel.Background = SuccessBackgroundBrush;
                    VerificationLimitePanel.BorderBrush = SuccessBorderBrush;
                }
            }
            else
            {
                if (LimiteIcon != null) LimiteIcon.Text = "❌";
                if (LimiteStatusText != null) LimiteStatusText.Text = $"Limite dépassée ({limite:N2} {devise}/jour)";
                if (VerificationLimitePanel != null)
                {
                    VerificationLimitePanel.Background = ErrorBackgroundBrush;
                    VerificationLimitePanel.BorderBrush = ErrorBorderBrush;
                }
            }
        }

        private void MettreAJourSignatureRequise()
        {
            // Signature can apply to both savings and current accounts
            if (_accountInfo == null && _currentAccountInfo == null)
            {
                SignaturePanel.Visibility = Visibility.Collapsed;
                SignatureCheckBox.IsChecked = false;
                _retrait.SignatureRequise = false;
                _retrait.AutorisationSuperviseur = false;
                return;
            }

            var seuil = GetSignatureThreshold();
            var signatureRequise = _retrait.Montant >= seuil;
            _retrait.SignatureRequise = signatureRequise;

            if (signatureRequise)
            {
                SignaturePanel.Visibility = Visibility.Visible;
            }
            else
            {
                SignaturePanel.Visibility = Visibility.Collapsed;
                SignatureCheckBox.IsChecked = false;
                _retrait.AutorisationSuperviseur = false;
            }
        }

        private void ReinitialiserVerifications()
        {
            var devise = GetDeviseCode();
            var limite = GetDailyWithdrawalLimit();
            if (SoldeIcon != null) SoldeIcon.Text = "⚠️";
            if (SoldeStatusText != null) SoldeStatusText.Text = "En attente de vérification";
            if (VerificationSoldePanel != null)
            {
                VerificationSoldePanel.Background = PendingBackgroundBrush;
                VerificationSoldePanel.BorderBrush = PendingBorderBrush;
            }

            if (LimiteIcon != null) LimiteIcon.Text = "⚠️";
            if (LimiteStatusText != null) LimiteStatusText.Text = $"Limite: {limite:N2} {devise}/jour";
            if (VerificationLimitePanel != null)
            {
                VerificationLimitePanel.Background = PendingBackgroundBrush;
                VerificationLimitePanel.BorderBrush = PendingBorderBrush;
            }

            if (SignaturePanel != null) SignaturePanel.Visibility = Visibility.Collapsed;
            if (SignatureCheckBox != null) SignatureCheckBox.IsChecked = false;
            _retrait.SignatureRequise = false;
            _retrait.AutorisationSuperviseur = false;
            _retrait.SoldeDisponible = 0;
        }

        private void MettreAJourNouveauSolde()
        {
            if ((_accountInfo == null && _currentAccountInfo == null) || _retrait.Montant <= 0)
            {
                if (NouveauSoldeText != null) NouveauSoldeText.Text = string.Empty;
                return;
            }

            var devise = GetDeviseCode();
            var disponible = GetCurrentAvailableBalance();
            var nouveauSolde = Math.Max(0, disponible - _retrait.Montant);
            if (NouveauSoldeText != null) NouveauSoldeText.Text = $"{nouveauSolde:N2} {devise}";
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
            // If operation has already succeeded, do not allow further validation (prevents double submissions)
            bool peutValider = (_accountInfo != null || _currentAccountInfo != null) &&
                               _retrait.Montant > 0 &&
                               _retrait.VerificationSolde &&
                               _retrait.RespecteLimite &&
                               (!_retrait.SignatureRequise || _retrait.AutorisationSuperviseur) &&
                               !_isProcessing &&
                               !_operationReussie;

            if (ValiderRetraitButton != null)
            {
                ValiderRetraitButton.IsEnabled = peutValider;
                // Keep the primary button neutral-looking when disabled to avoid an
                // overly prominent red bar on load; use the primary red when enabled.
                ValiderRetraitButton.Background = peutValider ? PrimaryActionBackgroundBrush : PrimaryActionDisabledBrush;
                ValiderRetraitButton.Foreground = peutValider ? Brushes.White : CreateBrush(51, 65, 85);
            }
        }

        private async void ValiderRetrait_Click(object sender, RoutedEventArgs e)
        {
            if ((_accountInfo == null && _currentAccountInfo == null) || _retrait.Montant <= 0 || _isProcessing)
            {
                return;
            }

            if (!_retrait.VerificationSolde)
            {
                MessageBox.Show("Solde insuffisant pour cette opération.", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                return;
            }

            // Limite de retrait désactivée - pas de restriction

            if (_retrait.SignatureRequise && !_retrait.AutorisationSuperviseur)
            {
                MessageBox.Show("Signature requise pour ce montant.", "Erreur", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            var motif = MotifTextBox?.Text?.Trim() ?? string.Empty;
            _retrait.MotifRetrait = motif;

            _isProcessing = true;
            MettreAJourValidation();

            Mouse.OverrideCursor = Cursors.Wait;
            if (ValiderRetraitButton != null) ValiderRetraitButton.Content = "⏳ Traitement...";

            try
            {
                if (_isCurrentAccount && _currentAccountInfo != null)
                {
                    // Process current account withdrawal
                    await ProcessCurrentAccountWithdrawalAsync(motif);
                }
                else if (_accountInfo != null)
                {
                    // Process savings account withdrawal
                    await ProcessSavingsAccountWithdrawalAsync(motif);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Erreur lors de la validation du retrait:\n\n{ex}",
                    "Erreur",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
            finally
            {
                _isProcessing = false;
                Mouse.OverrideCursor = null;
                MettreAJourValidation();
            }
        }

        private async Task ProcessSavingsAccountWithdrawalAsync(string motif)
        {
            if (_accountInfo == null) return;

                if (_isCurrentAccount && _currentAccountInfo != null)
                {
                    var currRequest = new CurrentAccountTransactionRequest
                    {
                        AccountNumber = _currentAccountInfo.AccountNumber,
                        Type = 1, // 1 = Withdrawal
                        Amount = _retrait.Montant,
                        Currency = ParseCurrency(_currentAccountInfo.Currency),
                        Description = $"Retrait - Caisse #{_retrait.NumeroCaisse}",
                        Notes = string.IsNullOrWhiteSpace(motif) ? null : motif,
                        ClientPresent = true,
                        VerificationMethod = "Caisse"
                    };

                    var currentResult = await _apiService.ProcessCurrentAccountTransactionAsync(currRequest);

                    if (!currentResult.IsSuccess || currentResult.Data == null)
                    {
                        MessageBox.Show(
                            currentResult.ErrorMessage ?? "Une erreur est survenue lors du traitement du retrait.",
                            "Erreur de retrait",
                            MessageBoxButton.OK,
                            MessageBoxImage.Error);
                        return;
                    }

                    _lastCurrentTransaction = currentResult.Data;
                    _operationReussie = true;

                    _retrait.Statut = StatutTransaction.Validee;
                    var deviseCur = ParseCurrency(_currentAccountInfo.Currency) == 0 ? "HTG" : "USD";

                    if (_clientActuel != null)
                    {
                        if (ParseCurrency(_currentAccountInfo.Currency) == 0)
                        {
                            _clientActuel.SoldeHTG = currentResult.Data.BalanceAfter;
                        }
                        else
                        {
                            _clientActuel.SoldeUSD = currentResult.Data.BalanceAfter;
                        }
                    }

                    var referenceCur = currentResult.Data.Reference;
                    var messageCur = $"Retrait validé avec succès!\n\n" +
                                     $"Type: Compte Courant\n" +
                                     $"Opération: {referenceCur}\n" +
                                     $"Client: {_currentAccountInfo.CustomerName}\n" +
                                     $"Succursale: {_currentAccountInfo.BranchName}\n" +
                                     $"Montant: {_retrait.Montant:N2} {deviseCur}\n" +
                                     $"Nouveau solde: {currentResult.Data.BalanceAfter:N2} {deviseCur}";

                    if (_retrait.SignatureRequise)
                    {
                        messageCur += "\n\n⚠️ Signature obtenue et validée";
                    }

                    MessageBox.Show(messageCur, "Retrait Validé", MessageBoxButton.OK, MessageBoxImage.Information);

                    if (NouveauSoldeText != null) NouveauSoldeText.Text = $"{currentResult.Data.BalanceAfter:N2} {deviseCur}";
                    if (ValiderRetraitButton != null)
                    {
                        ValiderRetraitButton.IsEnabled = false;
                        ValiderRetraitButton.Content = "✅ Retrait Validé";
                    }
                    if (ImprimerReçuButton != null) ImprimerReçuButton.IsEnabled = true;
                    try { AppServices.RaiseTransactionProcessed(); } catch { }

                    return;
                }

                var request = new SavingsTransactionRequest
                {
                    AccountNumber = _accountInfo.AccountNumber,
                    Type = SavingsTransactionType.Withdrawal,
                    Amount = _retrait.Montant,
                    Description = $"Retrait - Caisse #{_retrait.NumeroCaisse}",
                    Notes = string.IsNullOrWhiteSpace(motif) ? null : motif
                };
            // Attach cashier and branch info so backend can consider cashier's branch
            request.CashierName = _retrait.Caissier;
            request.CashierCaisseNumber = _retrait.NumeroCaisse;
            request.BranchId = _apiService?.CurrentUser?.BranchId;
            request.BranchName = _apiService?.CurrentUser == null ? null : string.IsNullOrWhiteSpace(_apiService.CurrentUser.FirstName) ? _apiService.CurrentUser.Email : (_apiService.CurrentUser.FirstName + (string.IsNullOrWhiteSpace(_apiService.CurrentUser.LastName) ? string.Empty : " " + _apiService.CurrentUser.LastName));

            var result = await _apiService.ProcessSavingsTransactionAsync(request);

            if (!result.IsSuccess || result.Data == null)
            {
                MessageBox.Show(
                    result.ErrorMessage ?? "Une erreur est survenue lors du traitement du retrait.",
                    "Erreur de retrait",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
                return;
            }

            _lastTransaction = result.Data;
            _operationReussie = true;

            _retrait.Statut = StatutTransaction.Validee;
            var devise = GetDeviseCode();

            if (_clientActuel != null)
            {
                if (_accountInfo.Currency == SavingsCurrency.HTG)
                {
                    _clientActuel.SoldeHTG = result.Data.BalanceAfter;
                }
                else
                {
                    _clientActuel.SoldeUSD = result.Data.BalanceAfter;
                }
            }

            var reference = !string.IsNullOrWhiteSpace(result.Data.Reference)
                ? result.Data.Reference
                : (!string.IsNullOrWhiteSpace(result.Data.ReceiptNumber) ? result.Data.ReceiptNumber : result.Data.Id);

            var message = $"Retrait validé avec succès!\n\n" +
                          $"Type: Compte Épargne\n" +
                          $"Opération: {reference}\n" +
                          $"Client: {_accountInfo.CustomerName}\n" +
                          $"Succursale: {_apiService?.CurrentUser?.BranchId ?? _accountInfo.BranchId} {(_apiService?.CurrentUser?.BranchId == null ? _accountInfo.BranchName : null)}\n" +
                          $"Montant: {_retrait.Montant:N2} {devise}\n" +
                          $"Nouveau solde: {result.Data.BalanceAfter:N2} {devise}";

            if (_retrait.SignatureRequise)
            {
                message += "\n\n⚠️ Signature obtenue et validée";
            }

            MessageBox.Show(message, "Retrait Validé", MessageBoxButton.OK, MessageBoxImage.Information);

            if (NouveauSoldeText != null) NouveauSoldeText.Text = $"{result.Data.BalanceAfter:N2} {devise}";
            if (ValiderRetraitButton != null)
            {
                ValiderRetraitButton.IsEnabled = false;
                ValiderRetraitButton.Content = "✅ Retrait Validé";
            }
            if (ImprimerReçuButton != null) ImprimerReçuButton.IsEnabled = true;
            // Notify other components (dashboard) that a transaction was processed successfully
            try { AppServices.RaiseTransactionProcessed(); } catch { }
        }

        private async Task ProcessCurrentAccountWithdrawalAsync(string motif)
        {
            if (_currentAccountInfo == null) return;

            var request = new CurrentAccountTransactionRequest
            {
                AccountNumber = _currentAccountInfo.AccountNumber,
                Type = 1, // 1 = Withdrawal
                Amount = _retrait.Montant,
                Currency = ParseCurrency(_currentAccountInfo.Currency),
                Description = $"Retrait - Caisse #{_retrait.NumeroCaisse}",
                Notes = string.IsNullOrWhiteSpace(motif) ? null : motif,
                ClientPresent = true,
                VerificationMethod = "Caisse"
            };

            var result = await _apiService.ProcessCurrentAccountTransactionAsync(request);

            if (!result.IsSuccess || result.Data == null)
            {
                MessageBox.Show(
                    result.ErrorMessage ?? "Une erreur est survenue lors du traitement du retrait.",
                    "Erreur de retrait",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
                return;
            }

            _lastCurrentTransaction = result.Data;
            _operationReussie = true;

            _retrait.Statut = StatutTransaction.Validee;
            var devise = GetDeviseCode();

            if (_clientActuel != null)
            {
                if (ParseCurrency(_currentAccountInfo.Currency) == 0) // HTG
                {
                    _clientActuel.SoldeHTG = result.Data.BalanceAfter;
                }
                else
                {
                    _clientActuel.SoldeUSD = result.Data.BalanceAfter;
                }
            }

            var reference = result.Data.Reference;

            var message = $"Retrait validé avec succès!\n\n" +
                          $"Type: Compte Courant\n" +
                          $"Opération: {reference}\n" +
                          $"Client: {_currentAccountInfo.CustomerName}\n" +
                          $"Succursale: {_currentAccountInfo.BranchName}\n" +
                          $"Montant: {_retrait.Montant:N2} {devise}\n" +
                          $"Nouveau solde: {result.Data.BalanceAfter:N2} {devise}";

            if (_retrait.SignatureRequise)
            {
                message += "\n\n⚠️ Signature obtenue et validée";
            }

            MessageBox.Show(message, "Retrait Validé", MessageBoxButton.OK, MessageBoxImage.Information);

            if (NouveauSoldeText != null) NouveauSoldeText.Text = $"{result.Data.BalanceAfter:N2} {devise}";
            if (ValiderRetraitButton != null)
            {
                ValiderRetraitButton.IsEnabled = false;
                ValiderRetraitButton.Content = "✅ Retrait Validé";
            }
            if (ImprimerReçuButton != null) ImprimerReçuButton.IsEnabled = true;
            // Notify other components (dashboard) that a transaction was processed successfully
            try { AppServices.RaiseTransactionProcessed(); } catch { }
        }

        private void ImprimerReçu_Click(object sender, RoutedEventArgs e)
        {
            if ((_lastTransaction == null && _lastCurrentTransaction == null) || (_accountInfo == null && _currentAccountInfo == null))
            {
                return;
            }

            try
            {
                string reçu = GenererReçu();

                MessageBox.Show(
                    $"Reçu envoyé à l'imprimante!\n\nContenu du reçu:\n\n{reçu}",
                    "Impression Reçu",
                    MessageBoxButton.OK,
                    MessageBoxImage.Information);

                _retrait.ReçuImprime = true;
                if (ImprimerReçuButton != null)
                {
                    ImprimerReçuButton.Content = "✅ Reçu Imprimé";
                    ImprimerReçuButton.IsEnabled = false;
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Erreur lors de l'impression:\n\n{ex}",
                    "Erreur",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        }

        private string GenererReçu()
        {
            var devise = GetDeviseCode();
            var reference = _lastTransaction?.Reference
                ?? _lastTransaction?.ReceiptNumber
                ?? _lastTransaction?.Id
                ?? _retrait.NumeroOperation;
            var nouveauSolde = _lastTransaction?.BalanceAfter ?? GetCurrentAvailableBalance();
            var signatureLine = _retrait.SignatureRequise ? "⚠️ Signature validée" : string.Empty;
            var motifLine = string.IsNullOrWhiteSpace(_retrait.MotifRetrait) ? string.Empty : $"Motif: {_retrait.MotifRetrait}";

            return $@"
═══════════════════════════════════════
            NALA KREDI TI MACHANN
        REÇU DE RETRAIT
═══════════════════════════════════════

Opération: {reference}
Date: {_retrait.DateOperation:dd/MM/yyyy HH:mm}
Caisse: {_retrait.NumeroCaisse}
Caissier: {_retrait.Caissier}

───────────────────────────────────────
CLIENT
───────────────────────────────────────
Compte: {_accountInfo?.AccountNumber}
Nom: {_accountInfo?.CustomerName}

───────────────────────────────────────
RETRAIT
───────────────────────────────────────
Montant: {_retrait.Montant:N2} {devise}
{signatureLine}

Nouveau solde: {nouveauSolde:N2} {devise}
{motifLine}

───────────────────────────────────────
Merci de votre confiance!
═══════════════════════════════════════";
        }

        private void Annuler_Click(object sender, RoutedEventArgs e)
        {
            if (_retrait.Statut == StatutTransaction.Validee)
            {
                MessageBox.Show(
                    "Impossible d'annuler une opération déjà validée.",
                    "Annulation",
                    MessageBoxButton.OK,
                    MessageBoxImage.Warning);
                return;
            }

            var result = MessageBox.Show(
                "Êtes-vous sûr de vouloir annuler cette opération?",
                "Confirmation",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question);

            if (result == MessageBoxResult.Yes)
            {
                DialogResult = false;
                Close();
            }
        }

        protected override void OnClosing(CancelEventArgs e)
        {
            _searchCts?.Cancel();
            base.OnClosing(e);
        }

        private decimal GetCurrentAvailableBalance()
        {
            if (_accountInfo != null)
            {
                if (_lastTransaction != null &&
                    string.Equals(_lastTransaction.AccountNumber, _accountInfo.AccountNumber, StringComparison.OrdinalIgnoreCase))
                {
                    return _lastTransaction.BalanceAfter;
                }
                return _accountInfo.AvailableBalance;
            }

            if (_currentAccountInfo != null)
            {
                if (_lastCurrentTransaction != null &&
                    string.Equals(_lastCurrentTransaction.AccountNumber, _currentAccountInfo.AccountNumber, StringComparison.OrdinalIgnoreCase))
                {
                    return _lastCurrentTransaction.BalanceAfter;
                }
                return _currentAccountInfo.AvailableBalance;
            }

            return 0m;
        }

        private decimal GetDailyWithdrawalLimit()
        {
            // Limite de retrait désactivée - retourner une limite très élevée
            return 999999999m;

            // Code original désactivé:
            /*
            if (_accountInfo != null)
            {
                if (_accountInfo.AccountLimits?.DailyWithdrawalLimit > 0)
                {
                    return _accountInfo.AccountLimits.DailyWithdrawalLimit;
                }

                if (_accountInfo.Currency == SavingsCurrency.USD)
                {
                    return Math.Round(LimiteRetraitDefautHTG / TauxUsdVersHtg, 2);
                }
            }

            */
        }

        private int ParseCurrency(string currency)
        {
            if (string.IsNullOrWhiteSpace(currency)) return 0;
            if (int.TryParse(currency, out var n)) return n == 1 ? 1 : 0;
            var s = currency.Trim().ToUpperInvariant();
            if (s == "USD") return 1;
            return 0; // default HTG
        }

        private decimal GetSignatureThreshold()
        {
                // Prefer explicit max withdrawal amount on savings account limits
                if (_accountInfo?.AccountLimits?.MaxWithdrawalAmount > 0)
                {
                    return _accountInfo.AccountLimits.MaxWithdrawalAmount;
                }

                // If current account provides a daily withdrawal limit, use it as a conservative threshold
                if (_currentAccountInfo != null && _currentAccountInfo.DailyWithdrawalLimit > 0)
                {
                    return _currentAccountInfo.DailyWithdrawalLimit;
                }

                // Currency-aware defaults
                if ((_accountInfo != null && _accountInfo.Currency == SavingsCurrency.USD) || (ParseCurrency(_currentAccountInfo?.Currency ?? string.Empty) == 1))
                {
                    return Math.Round(SeuilSignatureDefautHTG / TauxUsdVersHtg, 2);
                }

                return SeuilSignatureDefautHTG;
        }

        private string GetDeviseCode()
        {
            if (_accountInfo != null)
            {
                return _accountInfo.Currency == SavingsCurrency.USD ? "USD" : "HTG";
            }

            if (_currentAccountInfo != null)
            {
                return ParseCurrency(_currentAccountInfo.Currency) == 1 ? "USD" : "HTG";
            }

            return _retrait.Devise == DeviseType.USD ? "USD" : "HTG";
        }

        private void SetValidationPending(string message)
        {
            if (ValidationIcon != null) ValidationIcon.Text = "⏳";
            if (ValidationText != null) ValidationText.Text = message;
            if (ValidationPanel != null)
            {
                ValidationPanel.Background = PendingBackgroundBrush;
                ValidationPanel.BorderBrush = PendingBorderBrush;
            }
        }

        private void SetValidationSuccess(string message)
        {
            if (ValidationIcon != null) ValidationIcon.Text = "✅";
            if (ValidationText != null) ValidationText.Text = message;
            if (ValidationPanel != null)
            {
                ValidationPanel.Background = SuccessBackgroundBrush;
                ValidationPanel.BorderBrush = SuccessBorderBrush;
            }
        }

        private void SetValidationError(string message)
        {
            if (ValidationIcon != null) ValidationIcon.Text = "❌";
            if (ValidationText != null) ValidationText.Text = message;
            if (ValidationPanel != null)
            {
                ValidationPanel.Background = ErrorBackgroundBrush;
                ValidationPanel.BorderBrush = ErrorBorderBrush;
            }
        }
    }
}
