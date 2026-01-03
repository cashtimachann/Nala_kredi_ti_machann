using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class OpenAccountWindow : Window
    {
        private readonly ApiService _apiService;
        private ObservableCollection<SavingsCustomerResponseDto> _clients = new();
        private SavingsCustomerResponseDto? _selectedClient;
        private DispatcherTimer _searchTimer;
        private decimal _validatedOpeningDeposit;

        public OpenAccountWindow(ApiService? apiService = null)
        {
            InitializeComponent();
            _apiService = apiService ?? AppServices.GetRequiredApiService();
            SetupEventHandlers();
            InitializeDefaults();
        }

        private void SetupEventHandlers()
        {
            CancelButton.Click += CancelButton_Click;
            OpenAccountButton.Click += OpenAccountButton_Click;
            SearchButton.Click += SearchButton_Click;
            AccountTypeComboBox.SelectionChanged += AccountTypeComboBox_SelectionChanged;
            ClientsListView.SelectionChanged += ClientsListView_SelectionChanged;
        }

        private void InitializeDefaults()
        {
            // Set default currency to HTG
            CurrencyComboBox.SelectedIndex = 0;
            // Set default account type to Savings
            AccountTypeComboBox.SelectedIndex = 0;
        }

        private async void SearchButton_Click(object sender, RoutedEventArgs e)
        {
            await PerformClientSearch();
        }

        private async System.Threading.Tasks.Task PerformClientSearch()
        {
            var searchTerm = SearchClientTextBox.Text?.Trim();
            if (string.IsNullOrWhiteSpace(searchTerm) || searchTerm.Length < 2)
            {
                ClientsListView.ItemsSource = null;
                return;
            }

            try
            {
                var aggregated = new List<SavingsCustomerResponseDto>();

                // Try exact lookup by customer ID first
                var byIdResult = await _apiService.GetSavingsCustomerByIdAsync(searchTerm);
                if (byIdResult.IsSuccess && byIdResult.Data != null)
                {
                    aggregated.Add(byIdResult.Data);
                }

                // If not found by ID, try fuzzy search on SavingsCustomer endpoint
                if (aggregated.Count == 0)
                {
                    var searchResult = await _apiService.SearchSavingsCustomersAsync(searchTerm);
                    if (searchResult.IsSuccess && searchResult.Data != null)
                    {
                        aggregated.AddRange(searchResult.Data);
                    }
                }

                // Fallback: legacy clientaccount search (returns accounts) to keep compatibility
                if (aggregated.Count == 0)
                {
                    var legacyResult = await _apiService.SearchClientAccountsAsync(searchTerm, 20);
                    if (legacyResult.IsSuccess && legacyResult.Data != null)
                    {
                        var customers = legacyResult.Data.Results.Select(account => new SavingsCustomerResponseDto
                        {
                            Id = account.CustomerId,
                            FirstName = account.CustomerName.Split(' ').FirstOrDefault() ?? "",
                            LastName = string.Join(" ", account.CustomerName.Split(' ').Skip(1)),
                            Contact = new SavingsCustomerContactDto
                            {
                                PrimaryPhone = account.CustomerPhone ?? ""
                            }
                        });

                        aggregated.AddRange(customers);
                    }
                }

                if (aggregated.Count > 0)
                {
                    _clients = new ObservableCollection<SavingsCustomerResponseDto>(aggregated);
                    ClientsListView.ItemsSource = _clients;
                }
                else
                {
                    ClientsListView.ItemsSource = null;
                    MessageBox.Show("Aucun client trouvé.", "Recherche", MessageBoxButton.OK, MessageBoxImage.Information);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de la recherche: {ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void ClientsListView_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            _selectedClient = ClientsListView.SelectedItem as SavingsCustomerResponseDto;
            if (_selectedClient != null)
            {
                SelectedClientText.Text = $"Client sélectionné: {_selectedClient.FullName} ({_selectedClient.Contact.PrimaryPhone})";
            }
            else
            {
                SelectedClientText.Text = "Aucun client sélectionné";
            }
        }

        private void AccountTypeComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            // Show/hide term duration for term savings accounts
            TermAccountPanel.Visibility = AccountTypeComboBox.SelectedIndex == 2 ? Visibility.Visible : Visibility.Collapsed;
        }

        private async void OpenAccountButton_Click(object sender, RoutedEventArgs e)
        {
            if (!ValidateForm())
            {
                return;
            }

            try
            {
                OpenAccountButton.IsEnabled = false;
                OpenAccountButton.Content = "⏳ Ouverture...";

                var (accountType, currency) = GetSelectedAccountOptions();

                if (!await EnsureNoDuplicateAccountAsync(accountType, currency))
                {
                    return;
                }

                if (accountType == SavingsAccountType.TermSavings)
                {
                    var termDto = CreateTermSavingsAccountOpeningDtoFromForm(currency);
                    var result = await _apiService.OpenTermSavingsAccountAsync(termDto);

                    if (result.IsSuccess)
                    {
                        MessageBox.Show("Compte d'épargne à terme ouvert avec succès!", "Succès", MessageBoxButton.OK, MessageBoxImage.Information);
                        DialogResult = true;
                        Close();
                    }
                    else
                    {
                        MessageBox.Show($"Erreur lors de l'ouverture du compte d'épargne à terme: {result.ErrorMessage}", 
                                      "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                    }
                }
                else
                {
                    var dto = CreateAccountOpeningDtoFromForm(accountType, currency);
                    var result = await _apiService.OpenSavingsAccountAsync(dto);

                    if (result.IsSuccess)
                    {
                        MessageBox.Show("Compte ouvert avec succès!", "Succès", MessageBoxButton.OK, MessageBoxImage.Information);
                        DialogResult = true;
                        Close();
                    }
                    else
                    {
                        MessageBox.Show($"Erreur lors de l'ouverture du compte: {result.ErrorMessage}", 
                                      "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur inattendue: {ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                OpenAccountButton.IsEnabled = true;
                OpenAccountButton.Content = "💾 Ouvrir Compte";
            }
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
            Close();
        }

        private bool ValidateForm()
        {
            if (_selectedClient == null)
            {
                MessageBox.Show("Veuillez sélectionner un client.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                SearchClientTextBox.Focus();
                return false;
            }

            if (AccountTypeComboBox.SelectedItem == null)
            {
                MessageBox.Show("Veuillez sélectionner un type de compte.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                AccountTypeComboBox.Focus();
                return false;
            }

            if (CurrencyComboBox.SelectedItem == null)
            {
                MessageBox.Show("Veuillez sélectionner une devise.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                CurrencyComboBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(OpeningDepositTextBox.Text) ||
                !TryParsePositiveAmount(OpeningDepositTextBox.Text, out var deposit) || deposit < 0)
            {
                MessageBox.Show("Veuillez entrer un dépôt initial positif ou nul (ex: 0 ou 1000).", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                OpeningDepositTextBox.Focus();
                return false;
            }

            _validatedOpeningDeposit = deposit;

            if (AccountTypeComboBox.SelectedIndex == 2 && TermDurationComboBox.SelectedItem == null)
            {
                MessageBox.Show("Veuillez sélectionner la durée du terme.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                TermDurationComboBox.Focus();
                return false;
            }

            return true;
        }

        private static bool TryParsePositiveAmount(string input, out decimal amount)
        {
            // Support both comma and dot as decimal separators to avoid user locale surprises
            var normalized = input.Replace(',', '.');
            var styles = System.Globalization.NumberStyles.Number;
            var culture = System.Globalization.CultureInfo.InvariantCulture;
            if (decimal.TryParse(normalized, styles, culture, out amount))
            {
                return amount >= 0;
            }

            // Fallback to current culture
            return decimal.TryParse(input, styles, System.Globalization.CultureInfo.CurrentCulture, out amount) && amount >= 0;
        }

        private (SavingsAccountType accountType, SavingsCurrency currency) GetSelectedAccountOptions()
        {
            var accountType = AccountTypeComboBox.SelectedIndex switch
            {
                0 => SavingsAccountType.Savings,
                1 => SavingsAccountType.Current,
                2 => SavingsAccountType.TermSavings,
                _ => SavingsAccountType.Savings
            };

            var currency = CurrencyComboBox.SelectedIndex == 0 ? SavingsCurrency.HTG : SavingsCurrency.USD;

            return (accountType, currency);
        }

        private SavingsAccountOpeningDto CreateAccountOpeningDtoFromForm(SavingsAccountType accountType, SavingsCurrency currency)
        {
            var (normalizedType, normalizedCurrency) = (accountType, currency);

            // Prefer branch from logged-in user; default to 1 if unavailable
            int branchId = _apiService.CurrentUser?.BranchId ?? 1;

            var authorizedSigners = new List<SavingsAccountAuthorizedSignerDto>();
            if (!string.IsNullOrWhiteSpace(Signer1NameTextBox.Text))
            {
                authorizedSigners.Add(new SavingsAccountAuthorizedSignerDto
                {
                    FullName = Signer1NameTextBox.Text.Trim(),
                    Phone = string.IsNullOrWhiteSpace(Signer1PhoneTextBox.Text) ? null : Signer1PhoneTextBox.Text.Trim()
                });
            }
            if (!string.IsNullOrWhiteSpace(Signer2NameTextBox.Text))
            {
                authorizedSigners.Add(new SavingsAccountAuthorizedSignerDto
                {
                    FullName = Signer2NameTextBox.Text.Trim(),
                    Phone = string.IsNullOrWhiteSpace(Signer2PhoneTextBox.Text) ? null : Signer2PhoneTextBox.Text.Trim()
                });
            }

            return new SavingsAccountOpeningDto
            {
                ExistingCustomerId = _selectedClient!.Id,
                AccountType = normalizedType,
                Currency = normalizedCurrency,
                InitialDeposit = _validatedOpeningDeposit,
                BranchId = branchId,
                AuthorizedSigners = authorizedSigners.Any() ? authorizedSigners : null,
                Purpose = string.IsNullOrWhiteSpace(PurposeTextBox.Text) ? null : PurposeTextBox.Text.Trim(),
                Notes = string.IsNullOrWhiteSpace(NotesTextBox.Text) ? null : NotesTextBox.Text.Trim()
            };
        }

        private TermSavingsAccountOpeningDto CreateTermSavingsAccountOpeningDtoFromForm(SavingsCurrency currency)
        {
            // Prefer branch from logged-in user; default to 1 if unavailable
            int branchId = _apiService.CurrentUser?.BranchId ?? 1;

            var termType = TermDurationComboBox.SelectedIndex switch
            {
                0 => TermSavingsType.ThreeMonths,
                1 => TermSavingsType.SixMonths,
                2 => TermSavingsType.TwelveMonths,
                3 => TermSavingsType.TwentyFourMonths,
                4 => TermSavingsType.ThirtySixMonths,
                _ => TermSavingsType.ThreeMonths
            };

            var authorizedSigners = new List<SavingsAccountAuthorizedSignerDto>();
            if (!string.IsNullOrWhiteSpace(Signer1NameTextBox.Text))
            {
                authorizedSigners.Add(new SavingsAccountAuthorizedSignerDto
                {
                    FullName = Signer1NameTextBox.Text.Trim(),
                    Phone = string.IsNullOrWhiteSpace(Signer1PhoneTextBox.Text) ? null : Signer1PhoneTextBox.Text.Trim()
                });
            }
            if (!string.IsNullOrWhiteSpace(Signer2NameTextBox.Text))
            {
                authorizedSigners.Add(new SavingsAccountAuthorizedSignerDto
                {
                    FullName = Signer2NameTextBox.Text.Trim(),
                    Phone = string.IsNullOrWhiteSpace(Signer2PhoneTextBox.Text) ? null : Signer2PhoneTextBox.Text.Trim()
                });
            }

            return new TermSavingsAccountOpeningDto
            {
                CustomerId = _selectedClient!.Id,
                Currency = currency,
                InitialDeposit = _validatedOpeningDeposit,
                BranchId = branchId,
                TermType = termType,
                AuthorizedSigners = authorizedSigners.Any() ? authorizedSigners : null,
                Purpose = string.IsNullOrWhiteSpace(PurposeTextBox.Text) ? null : PurposeTextBox.Text.Trim(),
                Notes = string.IsNullOrWhiteSpace(NotesTextBox.Text) ? null : NotesTextBox.Text.Trim()
            };
        }

        private async System.Threading.Tasks.Task<bool> EnsureNoDuplicateAccountAsync(SavingsAccountType accountType, SavingsCurrency currency)
        {
            var lookupResult = await _apiService.GetClientAccountsByCustomerIdAsync(_selectedClient!.Id, 100);
            if (!lookupResult.IsSuccess)
            {
                MessageBox.Show($"Impossible de vérifier les comptes existants: {lookupResult.ErrorMessage}", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                return false;
            }

            var normalizedType = accountType.ToString();
            var normalizedCurrency = currency.ToString().ToUpperInvariant();

            var hasDuplicate = lookupResult.Data?.Any(acc =>
                string.Equals(acc.CustomerId, _selectedClient!.Id, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(acc.AccountType, normalizedType, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(acc.Currency, normalizedCurrency, StringComparison.OrdinalIgnoreCase)) == true;

            if (hasDuplicate)
            {
                MessageBox.Show($"Ce client possède déjà un compte {normalizedType} en {normalizedCurrency}.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                return false;
            }

            return true;
        }
    }
}