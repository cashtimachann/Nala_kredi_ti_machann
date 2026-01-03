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
    public partial class NouveauDepotWindow : Window
    {
        private const int MinimumAccountNumberLength = 6;

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

        private readonly ApiService _apiService;

        private DepotModel _depot = new();
        private ClientModel? _clientActuel;
        private SavingsAccountInfo? _accountInfo;
        private TermSavingsAccountInfo? _termAccountInfo;
        private CurrentAccountInfo? _currentAccountInfo;
        private SavingsTransactionResponse? _lastTransaction;
        private CurrentAccountTransactionResponse? _lastCurrentTransaction;
        private CancellationTokenSource? _searchCts;
        private bool _isProcessing;
        private bool _operationReussie;
        private bool _isCurrentAccount;
        private bool _isTermSavingsAccount;

        public bool OperationReussie => _operationReussie;

        public NouveauDepotWindow(ApiService apiService)
        {
            InitializeComponent();
            _apiService = apiService ?? throw new ArgumentNullException(nameof(apiService));
            try
            {
                InitialiserOperation();
            }
            catch (Exception ex)
            {
                // Include stack trace to help find the exact source of NullReferenceException
                MessageBox.Show(
                    $"Erè pandan inisyalizasyon fenèt depo:\n\n{ex}",
                    "Erè",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        }

        private void InitialiserOperation()
        {
            _depot = new DepotModel();
            _operationReussie = false;
            _lastTransaction = null;

            // Populate cashier information from the current authenticated user when available
            try
            {
                var user = _apiService?.CurrentUser;
                if (user != null)
                {
                    var fullName = string.IsNullOrWhiteSpace(user.FirstName) ? user.Email : (string.IsNullOrWhiteSpace(user.LastName) ? user.FirstName : $"{user.FirstName} {user.LastName}");
                    _depot.Caissier = fullName;
                }
            }
            catch
            {
                // Fall back to default defined in model if anything goes wrong
            }

            if (NumeroOperationText != null)
                NumeroOperationText.Text = _depot.NumeroOperation;
            if (DateHeureText != null)
                DateHeureText.Text = _depot.DateOperation.ToString("dd/MM/yyyy HH:mm");
            if (CaissierText != null)
                CaissierText.Text = _depot.Caissier;

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
            if (NouveauSoldeText != null)
            {
                NouveauSoldeText.Text = string.Empty;
            }

            if (ImprimerReçuButton != null)
                ImprimerReçuButton.IsEnabled = false;
            if (ValiderDepotButton != null)
                ValiderDepotButton.IsEnabled = false;

            ResetClientInfo();
            NumeroCompteTextBox?.Focus();
        }

        private void ResetClientInfo()
        {
            _clientActuel = null;
            _accountInfo = null;
            // Some of these UI controls may not be initialized in rare cases
            // (e.g., partial XAML mismatch). Use null-conditional operators to
            // avoid NullReferenceExceptions and keep the UI stable.
            if (ClientInfoPanel != null) ClientInfoPanel.Visibility = Visibility.Collapsed;
            SetValidationPending("En attente");
            if (SoldeHTGText != null) SoldeHTGText.Text = "💵 -- HTG";
            if (SoldeUSDText != null) SoldeUSDText.Text = "💲 -- USD";
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

                    // Try term savings account
                    var termResult = await _apiService.GetTermSavingsAccountByNumberAsync(numeroCompte);
                    if (cts.IsCancellationRequested)
                    {
                        return;
                    }

                    if (termResult.IsSuccess && termResult.Data != null)
                    {
                        _isTermSavingsAccount = true;
                        ApplyTermSavingsInfo(termResult.Data);
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
            if (ClientInfoPanel != null) ClientInfoPanel.Visibility = Visibility.Collapsed;
            SetValidationError(string.IsNullOrWhiteSpace(message) ? "Compte introuvable" : message);
            if (MontantTextBox != null) MontantTextBox.IsEnabled = false;
            MettreAJourValidation();
        }

        private void ApplyAccountInfo(SavingsAccountInfo account)
        {
            _accountInfo = account;
            _currentAccountInfo = null;
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

            MettreAJourNouveauSolde();
            MettreAJourValidation();
        }

        private void ApplyTermSavingsInfo(TermSavingsAccountInfo account)
        {
            _termAccountInfo = account;
            _accountInfo = null;
            _currentAccountInfo = null;

            var nameParts = (account.CustomerName ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var prenom = nameParts.Length > 0 ? nameParts[0] : string.Empty;
            var nom = nameParts.Length > 1 ? string.Join(' ', nameParts.Skip(1)) : string.Empty;

            _clientActuel = new ClientModel
            {
                NumeroCompte = account.AccountNumber,
                Prenom = prenom,
                Nom = nom,
                Telephone = string.Empty,
                SoldeHTG = ParseCurrency(account.Currency) == 0 ? account.Balance : 0m,
                SoldeUSD = ParseCurrency(account.Currency) == 1 ? account.Balance : 0m
            };

            _depot.NumeroCompte = account.AccountNumber;
            _depot.Client = _clientActuel;
            _depot.Devise = ParseCurrency(account.Currency) == 0 ? DeviseType.HTG : DeviseType.USD;

            if (ClientNomText != null) ClientNomText.Text = $"👤 {_clientActuel.NomComplet}".Trim();
            if (ClientTelephoneText != null) ClientTelephoneText.Text = "📱 Téléphone non disponible";
            if (SoldeHTGText != null) SoldeHTGText.Text = $"💵 {_clientActuel.SoldeHTG:N2} HTG";
            if (SoldeUSDText != null) SoldeUSDText.Text = $"💲 {_clientActuel.SoldeUSD:N2} USD";

            if (ClientInfoPanel != null) ClientInfoPanel.Visibility = Visibility.Visible;
            SetValidationSuccess("Client trouvé (Compte Épargne à Terme)");

            if (DeviseComboBox != null) DeviseComboBox.SelectedIndex = ParseCurrency(account.Currency) == 0 ? 0 : 1;
            if (DeviseComboBox != null) DeviseComboBox.IsEnabled = false;
            if (MontantTextBox != null)
            {
                MontantTextBox.IsEnabled = true;
                MontantTextBox.Focus();
                MontantTextBox.SelectAll();
            }

            MettreAJourNouveauSolde();
            MettreAJourValidation();
        }

        private int ParseCurrency(string currency)
        {
            if (string.IsNullOrWhiteSpace(currency)) return 0;
            if (int.TryParse(currency, out var n)) return n == 1 ? 1 : 0;
            var s = currency.Trim().ToUpperInvariant();
            if (s == "USD") return 1;
            return 0; // default HTG
        }
        private void ApplyCurrentAccountInfo(CurrentAccountInfo account)
        {
            _currentAccountInfo = account;
            _accountInfo = null;
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

            MettreAJourNouveauSolde();
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
                _depot.Montant = 0;
                ConversionPanel.Visibility = Visibility.Collapsed;
                NouveauSoldeText.Text = string.Empty;
                MettreAJourValidation();
                return;
            }

            _depot.Montant = montant;
            ConversionPanel.Visibility = Visibility.Collapsed;
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
            MettreAJourNouveauSolde();
        }

        private void MettreAJourNouveauSolde()
        {
            if (_depot.Montant <= 0)
            {
                if (NouveauSoldeText != null) NouveauSoldeText.Text = string.Empty;
                return;
            }

            decimal baseSolde = 0;
            string devise = "HTG";

            if (_accountInfo != null)
            {
                baseSolde = _accountInfo.AvailableBalance;
                if (_lastTransaction != null &&
                    string.Equals(_lastTransaction.AccountNumber, _accountInfo.AccountNumber, StringComparison.OrdinalIgnoreCase))
                {
                    baseSolde = _lastTransaction.BalanceAfter;
                }
                devise = _accountInfo.Currency == SavingsCurrency.HTG ? "HTG" : "USD";
            }
            else if (_currentAccountInfo != null)
            {
                baseSolde = _currentAccountInfo.AvailableBalance;
                if (_lastCurrentTransaction != null &&
                    string.Equals(_lastCurrentTransaction.AccountNumber, _currentAccountInfo.AccountNumber, StringComparison.OrdinalIgnoreCase))
                {
                    baseSolde = _lastCurrentTransaction.BalanceAfter;
                }
                devise = ParseCurrency(_currentAccountInfo.Currency) == 0 ? "HTG" : "USD";
            }
            else
            {
                if (NouveauSoldeText != null) NouveauSoldeText.Text = string.Empty;
                return;
            }

            var nouveauSolde = baseSolde + _depot.Montant;
            if (NouveauSoldeText != null) NouveauSoldeText.Text = $"{nouveauSolde:N2} {devise}";
        }

        private void MettreAJourValidation()
        {
            // Do not enable the validate button when the operation has already been marked as successful.
            bool peutValider = (_accountInfo != null || _currentAccountInfo != null) && _depot.Montant > 0 && !_isProcessing && !_operationReussie;
            if (ValiderDepotButton != null) ValiderDepotButton.IsEnabled = peutValider;
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

        private async void ValiderDepot_Click(object sender, RoutedEventArgs e)
        {
            if ((_accountInfo == null && _currentAccountInfo == null) || _depot.Montant <= 0 || _isProcessing)
            {
                return;
            }

            _isProcessing = true;
            MettreAJourValidation();

            Mouse.OverrideCursor = Cursors.Wait;
            if (ValiderDepotButton != null) ValiderDepotButton.Content = "⏳ Traitement...";

            try
            {
                if (_isCurrentAccount && _currentAccountInfo != null)
                {
                    // Process current account deposit
                    await ProcessCurrentAccountDepositAsync();
                }
                else if (_accountInfo != null)
                {
                    // Process savings account deposit
                    await ProcessSavingsAccountDepositAsync();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Erreur lors de la validation du dépôt:\n\n{ex.Message}",
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

        private async Task ProcessSavingsAccountDepositAsync()
        {
            if (_accountInfo == null && _termAccountInfo == null) return;

            if (_termAccountInfo != null)
            {
                var termRequest = new TermSavingsTransactionRequest
                {
                    AccountNumber = _termAccountInfo.AccountNumber,
                    Type = SavingsTransactionType.Deposit,
                    Amount = _depot.Montant,
                    // Currency is expressed as 0=HTG, 1=USD in the API contract
                    Currency = ParseCurrency(_termAccountInfo.Currency),
                    Description = $"Dépôt - Caisse #{_depot.NumeroCaisse}",
                    CustomerPresent = true,
                    VerificationMethod = "Caisse"
                };

                var termResult = await _apiService.ProcessTermSavingsTransactionAsync(termRequest);

                if (!termResult.IsSuccess)
                {
                    MessageBox.Show(
                        termResult.ErrorMessage ?? "Une erreur est survenue lors du traitement du dépôt.",
                        "Erreur de dépôt",
                        MessageBoxButton.OK,
                        MessageBoxImage.Error);
                    return;
                }

                // Refresh balance by fetching account again
                var refreshed = await _apiService.GetTermSavingsAccountByNumberAsync(_termAccountInfo.AccountNumber);
                if (refreshed.IsSuccess && refreshed.Data != null)
                {
                    ApplyTermSavingsInfo(refreshed.Data);
                }


                _operationReussie = true;
                _depot.Statut = StatutTransaction.Validee;

                var termDevise = ParseCurrency(_termAccountInfo.Currency) == 0 ? "HTG" : "USD";
                var termMessage = $"Dépôt validé avec succès!\n\n" +
                                  $"Type: Compte Épargne à Terme\n" +
                                  $"Opération: {_depot.NumeroOperation}\n" +
                                  $"Client: {_termAccountInfo.CustomerName}\n" +
                                  $"Succursale: {_termAccountInfo.BranchName}\n" +
                                  $"Montant: {_depot.Montant:N2} {termDevise}\n" +
                                  $"Nouveau solde: {_termAccountInfo.Balance:N2} {termDevise}";

                MessageBox.Show(termMessage, "Dépôt Validé", MessageBoxButton.OK, MessageBoxImage.Information);

                if (NouveauSoldeText != null) NouveauSoldeText.Text = $"{_termAccountInfo.Balance:N2} {termDevise}";
                if (ValiderDepotButton != null)
                {
                    ValiderDepotButton.IsEnabled = false;
                    ValiderDepotButton.Content = "✅ Dépôt Validé";
                }
                if (ImprimerReçuButton != null) ImprimerReçuButton.IsEnabled = true;
                try { AppServices.RaiseTransactionProcessed(); } catch { }

                return;
            }

            var request = new SavingsTransactionRequest
            {
                AccountNumber = _accountInfo.AccountNumber,
                Type = SavingsTransactionType.Deposit,
                Amount = _depot.Montant,
                Description = $"Dépôt - Caisse #{_depot.NumeroCaisse}"
            };
            // Attach cashier and branch information so backend can consider cashier's branch
            request.CashierName = _depot.Caissier;
            request.CashierCaisseNumber = _depot.NumeroCaisse;
            request.BranchId = _apiService?.CurrentUser?.BranchId;
            request.BranchName = _apiService?.CurrentUser == null ? null : string.IsNullOrWhiteSpace(_apiService.CurrentUser.FirstName) ? _apiService.CurrentUser.Email : (_apiService.CurrentUser.FirstName + (string.IsNullOrWhiteSpace(_apiService.CurrentUser.LastName) ? string.Empty : " " + _apiService.CurrentUser.LastName));

            var result = await _apiService.ProcessSavingsTransactionAsync(request);

            if (!result.IsSuccess || result.Data == null)
            {
                MessageBox.Show(
                    result.ErrorMessage ?? "Une erreur est survenue lors du traitement du dépôt.",
                    "Erreur de dépôt",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
                return;
            }

            _lastTransaction = result.Data;
            _operationReussie = true;

            // Mise à jour de l'UI après succès
            _depot.Statut = StatutTransaction.Validee;
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

            var devise = _accountInfo.Currency == SavingsCurrency.HTG ? "HTG" : "USD";
            var reference = !string.IsNullOrWhiteSpace(result.Data.Reference)
                ? result.Data.Reference
                : (!string.IsNullOrWhiteSpace(result.Data.ReceiptNumber) ? result.Data.ReceiptNumber : result.Data.Id);

            var message = $"Dépôt validé avec succès!\n\n" +
                         $"Type: Compte Épargne\n" +
                         $"Opération: {reference}\n" +
                          $"Client: {_accountInfo.CustomerName}\n" +
                          $"Succursale: {_apiService?.CurrentUser?.BranchId ?? _accountInfo.BranchId} {(_apiService?.CurrentUser?.BranchId == null ? _accountInfo.BranchName : null)}\n" +
                         $"Montant: {_depot.Montant:N2} {devise}\n" +
                         $"Nouveau solde: {result.Data.BalanceAfter:N2} {devise}";

            MessageBox.Show(message, "Dépôt Validé", MessageBoxButton.OK, MessageBoxImage.Information);

            if (NouveauSoldeText != null) NouveauSoldeText.Text = $"{result.Data.BalanceAfter:N2} {devise}";
            if (ValiderDepotButton != null)
            {
                ValiderDepotButton.IsEnabled = false;
                ValiderDepotButton.Content = "✅ Dépôt Validé";
            }
            if (ImprimerReçuButton != null) ImprimerReçuButton.IsEnabled = true;
            // Notify other components (dashboard) that a transaction was processed successfully
            try { AppServices.RaiseTransactionProcessed(); } catch { }
        }

        private async Task ProcessCurrentAccountDepositAsync()
        {
            if (_currentAccountInfo == null) return;

            var request = new CurrentAccountTransactionRequest
            {
                AccountNumber = _currentAccountInfo.AccountNumber,
                Type = 0, // 0 = Deposit
                Amount = _depot.Montant,
                Currency = ParseCurrency(_currentAccountInfo.Currency),
                Description = $"Dépôt - Caisse #{_depot.NumeroCaisse}",
                ClientPresent = true,
                VerificationMethod = "Caisse"
            };

            var result = await _apiService.ProcessCurrentAccountTransactionAsync(request);

            if (!result.IsSuccess || result.Data == null)
            {
                MessageBox.Show(
                    result.ErrorMessage ?? "Une erreur est survenue lors du traitement du dépôt.",
                    "Erreur de dépôt",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
                return;
            }

            _lastCurrentTransaction = result.Data;
            _operationReussie = true;

            // Mise à jour de l'UI après succès
            _depot.Statut = StatutTransaction.Validee;
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

            var devise = ParseCurrency(_currentAccountInfo.Currency) == 0 ? "HTG" : "USD";
            var reference = result.Data.Reference;

            var message = $"Dépôt validé avec succès!\n\n" +
                         $"Type: Compte Courant\n" +
                         $"Opération: {reference}\n" +
                          $"Client: {_currentAccountInfo.CustomerName}\n" +
                          $"Succursale: {_currentAccountInfo.BranchName}\n" +
                         $"Montant: {_depot.Montant:N2} {devise}\n" +
                         $"Nouveau solde: {result.Data.BalanceAfter:N2} {devise}";

            MessageBox.Show(message, "Dépôt Validé", MessageBoxButton.OK, MessageBoxImage.Information);

            if (NouveauSoldeText != null) NouveauSoldeText.Text = $"{result.Data.BalanceAfter:N2} {devise}";
            if (ValiderDepotButton != null)
            {
                ValiderDepotButton.IsEnabled = false;
                ValiderDepotButton.Content = "✅ Dépôt Validé";
            }
            if (ImprimerReçuButton != null) ImprimerReçuButton.IsEnabled = true;
            // Notify other components (dashboard) that a transaction was processed successfully
            try { AppServices.RaiseTransactionProcessed(); } catch { }
        }

        private void ImprimerReçu_Click(object sender, RoutedEventArgs e)
        {
            if (_lastTransaction == null || _accountInfo == null)
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

                _depot.ReçuImprime = true;
                if (ImprimerReçuButton != null)
                {
                    ImprimerReçuButton.Content = "✅ Reçu Imprimé";
                    ImprimerReçuButton.IsEnabled = false;
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Erreur lors de l'impression:\n\n{ex.Message}",
                    "Erreur",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        }

        private string GenererReçu()
        {
            var devise = _accountInfo!.Currency == SavingsCurrency.HTG ? "HTG" : "USD";
            var reference = _lastTransaction?.Reference
                ?? _lastTransaction?.ReceiptNumber
                ?? _depot.NumeroOperation;
            var nouveauSolde = _lastTransaction?.BalanceAfter ?? 0m;

            return $@"
═══════════════════════════════════════
            NALA KREDI TI MACHANN
        REÇU DE DÉPÔT
═══════════════════════════════════════

Opération: {reference}
Date: {_depot.DateOperation:dd/MM/yyyy HH:mm}
Caisse: {_depot.NumeroCaisse}
Caissier: {_depot.Caissier}

───────────────────────────────────────
CLIENT
───────────────────────────────────────
Compte: {_accountInfo.AccountNumber}
Nom: {_accountInfo.CustomerName}

───────────────────────────────────────
DÉPÔT
───────────────────────────────────────
Montant: {_depot.Montant:N2} {devise}
Nouveau solde: {nouveauSolde:N2} {devise}

───────────────────────────────────────
Merci de votre confiance!
═══════════════════════════════════════";
        }

        private void Annuler_Click(object sender, RoutedEventArgs e)
        {
            if (_depot.Statut == StatutTransaction.Validee)
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
    }
}
