using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class PrintDocumentsView : UserControl
    {
        private readonly ApiService _apiService;
        private string _selectedDocumentType = "";
        private SavingsAccountResponseDto? _selectedAccount;
        private SavingsCustomerResponseDto? _selectedCustomer;

        public PrintDocumentsView(ApiService? apiService = null)
        {
            InitializeComponent();
            _apiService = apiService ?? AppServices.GetRequiredApiService();
            
            SetupEventHandlers();
            InitializeDates();
        }

        private void SetupEventHandlers()
        {
            RefreshButton.Click += RefreshButton_Click;
            SearchButton.Click += SearchButton_Click;
            PreviewButton.Click += PreviewButton_Click;
            PrintButton.Click += PrintButton_Click;
            SavePdfButton.Click += SavePdfButton_Click;
            SearchTextBox.KeyDown += SearchTextBox_KeyDown;
        }

        private void InitializeDates()
        {
            // Set default date range: last 30 days
            EndDatePicker.SelectedDate = DateTime.Now;
            StartDatePicker.SelectedDate = DateTime.Now.AddDays(-30);
        }

        // Document Type Selection Handlers
        private void AttestationCard_Click(object sender, MouseButtonEventArgs e)
        {
            SelectDocumentType("Attestation", "📜 Attestation de Compte");
            DateRangePanel.Visibility = Visibility.Collapsed;
        }

        private void StatementCard_Click(object sender, MouseButtonEventArgs e)
        {
            SelectDocumentType("Statement", "📊 Relevé de Compte");
            DateRangePanel.Visibility = Visibility.Visible;
        }

        private void CertificateCard_Click(object sender, MouseButtonEventArgs e)
        {
            SelectDocumentType("Certificate", "🎓 Certificat Bancaire");
            DateRangePanel.Visibility = Visibility.Collapsed;
        }

        private void ContractCard_Click(object sender, MouseButtonEventArgs e)
        {
            SelectDocumentType("Contract", "📋 Contrat d'Ouverture");
            DateRangePanel.Visibility = Visibility.Collapsed;
        }

        private void ReceiptCard_Click(object sender, MouseButtonEventArgs e)
        {
            SelectDocumentType("Receipt", "🧾 Reçu de Transaction");
            DateRangePanel.Visibility = Visibility.Collapsed;
        }

        private void BalanceCard_Click(object sender, MouseButtonEventArgs e)
        {
            SelectDocumentType("Balance", "💰 Attestation de Solde");
            DateRangePanel.Visibility = Visibility.Collapsed;
        }

        private void SelectDocumentType(string docType, string displayName)
        {
            _selectedDocumentType = docType;
            SelectedDocumentTypeText.Text = displayName;
            
            StatusMessageText.Text = $"{displayName} sélectionné";
            StatusMessageText.Foreground = new SolidColorBrush(Color.FromRgb(16, 185, 129));
            
            // Enable preview if account is already selected
            UpdateButtonStates();
        }

        private void SearchTextBox_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Enter)
            {
                SearchButton_Click(sender, e);
            }
        }

        private async void SearchButton_Click(object sender, RoutedEventArgs e)
        {
            var searchText = SearchTextBox.Text?.Trim();
            if (string.IsNullOrEmpty(searchText))
            {
                MessageBox.Show("Veuillez entrer un numéro de compte ou nom de client.", 
                    "Recherche", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            await SearchAccountAsync(searchText);
        }

        private async Task SearchAccountAsync(string searchText)
        {
            try
            {
                StatusMessageText.Text = "Recherche en cours...";
                StatusMessageText.Foreground = new SolidColorBrush(Color.FromRgb(100, 116, 139));

                // Search for account by account number
                var result = await _apiService.GetSavingsAccountsAsync();
                var accounts = result?.Data?.Accounts;
                
                var account = accounts?.FirstOrDefault(a => 
                    a.AccountNumber?.Contains(searchText, StringComparison.OrdinalIgnoreCase) == true ||
                    a.CustomerName?.Contains(searchText, StringComparison.OrdinalIgnoreCase) == true);

                if (account == null)
                {
                    MessageBox.Show($"Aucun compte trouvé pour: {searchText}", 
                        "Recherche", MessageBoxButton.OK, MessageBoxImage.Information);
                    StatusMessageText.Text = "Compte non trouvé";
                    StatusMessageText.Foreground = new SolidColorBrush(Color.FromRgb(239, 68, 68));
                    return;
                }

                _selectedAccount = account;
                
                // Try to get customer details
                if (!string.IsNullOrEmpty(account.CustomerId))
                {
                    try
                    {
                        var customersResult = await _apiService.GetSavingsCustomersAsync(1, 100);
                        var customers = customersResult?.Data;
                        _selectedCustomer = customers?.FirstOrDefault(c => c.Id == account.CustomerId);
                    }
                    catch
                    {
                        // Customer details not critical
                    }
                }

                DisplayAccountInfo();
                UpdateButtonStates();

                StatusMessageText.Text = "Compte trouvé avec succès";
                StatusMessageText.Foreground = new SolidColorBrush(Color.FromRgb(16, 185, 129));
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de la recherche:\n{ex.Message}", 
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                StatusMessageText.Text = "Erreur de recherche";
                StatusMessageText.Foreground = new SolidColorBrush(Color.FromRgb(239, 68, 68));
            }
        }

        private void DisplayAccountInfo()
        {
            if (_selectedAccount == null)
                return;

            AccountInfoPanel.Visibility = Visibility.Visible;

            AccountNumberText.Text = _selectedAccount.AccountNumber ?? "--";
            AccountTypeText.Text = GetAccountTypeDisplay(_selectedAccount.AccountType);
            AccountBalanceText.Text = $"{_selectedAccount.Balance:N2} {_selectedAccount.Currency}";

            if (_selectedCustomer != null)
            {
                ClientNameText.Text = _selectedCustomer.FullName ?? "--";
                ClientPhoneText.Text = _selectedCustomer.Contact?.PrimaryPhone ?? "--";
                ClientDocumentText.Text = _selectedCustomer.Identity?.DocumentNumber ?? "--";
            }
            else
            {
                ClientNameText.Text = _selectedAccount.CustomerName ?? "--";
                ClientPhoneText.Text = _selectedCustomer?.Contact?.PrimaryPhone ?? "--";
                ClientDocumentText.Text = "--";
            }
        }

        private string GetAccountTypeDisplay(SavingsAccountType? accountType)
        {
            if (!accountType.HasValue)
                return "--";
                
            return accountType.Value switch
            {
                SavingsAccountType.Savings => "Épargne",
                SavingsAccountType.Current => "Courant",
                SavingsAccountType.TermSavings => "Épargne à Terme",
                _ => accountType.ToString() ?? "--"
            };
        }

        private void UpdateButtonStates()
        {
            bool hasDocumentType = !string.IsNullOrEmpty(_selectedDocumentType);
            bool hasAccount = _selectedAccount != null;
            bool canProcess = hasDocumentType && hasAccount;

            PreviewButton.IsEnabled = canProcess;
            PrintButton.IsEnabled = canProcess;
            SavePdfButton.IsEnabled = canProcess;
        }

        private void RefreshButton_Click(object sender, RoutedEventArgs e)
        {
            ClearForm();
        }

        private void ClearForm()
        {
            SearchTextBox.Clear();
            _selectedAccount = null;
            _selectedCustomer = null;
            AccountInfoPanel.Visibility = Visibility.Collapsed;
            PreviewScrollViewer.Visibility = Visibility.Collapsed;
            EmptyStatePanel.Visibility = Visibility.Visible;
            UpdateButtonStates();
            StatusMessageText.Text = "";
        }

        private void PreviewButton_Click(object sender, RoutedEventArgs e)
        {
            if (_selectedAccount == null || string.IsNullOrEmpty(_selectedDocumentType))
                return;

            GenerateDocumentPreview();
        }

        private void GenerateDocumentPreview()
        {
            DocumentPreviewContent.Children.Clear();

            switch (_selectedDocumentType)
            {
                case "Attestation":
                    GenerateAttestationPreview();
                    break;
                case "Statement":
                    GenerateStatementPreview();
                    break;
                case "Certificate":
                    GenerateCertificatePreview();
                    break;
                case "Contract":
                    GenerateContractPreview();
                    break;
                case "Receipt":
                    GenerateReceiptPreview();
                    break;
                case "Balance":
                    GenerateBalancePreview();
                    break;
            }

            EmptyStatePanel.Visibility = Visibility.Collapsed;
            PreviewScrollViewer.Visibility = Visibility.Visible;
            
            StatusMessageText.Text = "Prévisualisation générée";
            StatusMessageText.Foreground = new SolidColorBrush(Color.FromRgb(16, 185, 129));
        }

        private void GenerateAttestationPreview()
        {
            var doc = DocumentPreviewContent;

            // Header
            AddDocumentHeader(doc, "ATTESTATION DE COMPTE");

            // Content
            AddParagraph(doc, $"Je soussigné(e), en qualité de représentant(e) de Nala Kredi Ti Machann, " +
                $"atteste que {_selectedCustomer?.FullName ?? _selectedAccount?.CustomerName ?? "le client"} " +
                $"est titulaire d'un compte d'épargne auprès de notre institution.", 16);

            AddSpacing(doc, 30);

            AddBoldText(doc, "Informations du compte:", 15);
            AddSpacing(doc, 10);
            AddInfoLine(doc, "Numéro de compte:", _selectedAccount?.AccountNumber ?? "--");
            AddInfoLine(doc, "Type de compte:", GetAccountTypeDisplay(_selectedAccount?.AccountType));
            AddInfoLine(doc, "Date d'ouverture:", _selectedAccount?.OpeningDate.ToString("dd/MM/yyyy") ?? "--");
            AddInfoLine(doc, "Statut:", _selectedAccount?.Status.ToString() ?? "--");

            AddSpacing(doc, 30);
            AddParagraph(doc, "Cette attestation est délivrée pour servir et valoir ce que de droit.", 14);

            // Footer
            AddDocumentFooter(doc);
        }

        private async void GenerateStatementPreview()
        {
            var doc = DocumentPreviewContent;

            // Header
            AddDocumentHeader(doc, "RELEVÉ DE COMPTE");

            // Period
            var startDate = StartDatePicker.SelectedDate ?? DateTime.Now.AddDays(-30);
            var endDate = EndDatePicker.SelectedDate ?? DateTime.Now;
            AddParagraph(doc, $"Période: {startDate:dd/MM/yyyy} au {endDate:dd/MM/yyyy}", 14);
            AddSpacing(doc, 20);

            // Account Info
            AddBoldText(doc, "Informations du compte:", 15);
            AddSpacing(doc, 10);
            AddInfoLine(doc, "Numéro de compte:", _selectedAccount?.AccountNumber ?? "--");
            AddInfoLine(doc, "Titulaire:", _selectedCustomer?.FullName ?? _selectedAccount?.CustomerName ?? "--");
            AddInfoLine(doc, "Type de compte:", GetAccountTypeDisplay(_selectedAccount?.AccountType));

            AddSpacing(doc, 20);

            // Load and display transactions
            if (_selectedAccount != null)
            {
                AddBoldText(doc, "Détail des transactions:", 15);
                AddSpacing(doc, 10);

                try
                {
                    var result = await _apiService.GetSavingsTransactionsAsync(
                        accountId: _selectedAccount.Id,
                        dateFrom: startDate,
                        dateTo: endDate,
                        page: 1,
                        pageSize: 100
                    );

                    if (result.IsSuccess && result.Data?.Transactions != null && result.Data.Transactions.Any())
                    {
                        // Create transactions table
                        var transactionsGrid = new Grid
                        {
                            Background = new SolidColorBrush(Colors.White),
                            Margin = new Thickness(0, 0, 0, 15)
                        };

                        // Define columns
                        transactionsGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(100) });
                        transactionsGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(120) });
                        transactionsGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(150) });
                        transactionsGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(100) });
                        transactionsGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(100) });

                        // Add header row
                        transactionsGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
                        AddTableHeader(transactionsGrid, 0, 0, "Date");
                        AddTableHeader(transactionsGrid, 0, 1, "Type");
                        AddTableHeader(transactionsGrid, 0, 2, "Référence");
                        AddTableHeader(transactionsGrid, 0, 3, "Montant");
                        AddTableHeader(transactionsGrid, 0, 4, "Solde");

                        // Data rows
                        int rowIndex = 1;
                        foreach (var transaction in result.Data.Transactions)
                        {
                            transactionsGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

                            AddTableCell(transactionsGrid, rowIndex, 0, transaction.ProcessedAt.ToString("dd/MM/yyyy HH:mm"));
                            AddTableCell(transactionsGrid, rowIndex, 1, GetTransactionTypeDisplay(transaction.Type));
                            AddTableCell(transactionsGrid, rowIndex, 2, transaction.Reference ?? transaction.ReceiptNumber ?? "--");
                            AddTableCell(transactionsGrid, rowIndex, 3, $"{transaction.Amount:N2}", 
                                transaction.Type == SavingsTransactionType.Deposit || transaction.Type == SavingsTransactionType.Interest 
                                    ? "#10b981" : "#ef4444");
                            AddTableCell(transactionsGrid, rowIndex, 4, $"{transaction.BalanceAfter:N2}");

                            rowIndex++;
                        }

                        doc.Children.Add(transactionsGrid);

                        AddSpacing(doc, 10);
                        AddParagraph(doc, $"Total transactions: {result.Data.Transactions.Count}", 11, true);
                    }
                    else
                    {
                        AddParagraph(doc, "Aucune transaction pour cette période.", 12, true);
                    }
                }
                catch (Exception ex)
                {
                    AddParagraph(doc, $"Erreur lors du chargement des transactions: {ex.Message}", 11, true);
                }

                AddSpacing(doc, 20);

                // Balance Summary
                AddBoldText(doc, "Résumé des soldes:", 15);
                AddSpacing(doc, 10);
                AddInfoLine(doc, "Solde actuel:", $"{_selectedAccount?.Balance:N2} {_selectedAccount?.Currency.ToString() ?? "HTG"}");
                AddInfoLine(doc, "Devise:", _selectedAccount?.Currency.ToString() ?? "HTG");
            }

            AddSpacing(doc, 20);

            // Footer
            AddDocumentFooter(doc);
        }

        private void GenerateCertificatePreview()
        {
            var doc = DocumentPreviewContent;

            // Header
            AddDocumentHeader(doc, "CERTIFICAT BANCAIRE");

            // Content
            AddSpacing(doc, 20);
            AddParagraph(doc, "La direction de Nala Kredi Ti Machann certifie que:", 16);
            AddSpacing(doc, 20);

            AddBoldText(doc, $"{_selectedCustomer?.FullName ?? _selectedAccount?.CustomerName ?? "Le client"}", 18);
            AddSpacing(doc, 15);

            AddParagraph(doc, "est client(e) en règle de notre institution financière et maintient " +
                $"un compte d'épargne actif depuis le {_selectedAccount?.OpeningDate.ToString("dd MMMM yyyy") ?? "--"}.", 15);

            AddSpacing(doc, 30);

            // Account details
            AddBoldText(doc, "Détails du compte:", 15);
            AddSpacing(doc, 10);
            AddInfoLine(doc, "Numéro de compte:", _selectedAccount?.AccountNumber ?? "--");
            AddInfoLine(doc, "Type:", GetAccountTypeDisplay(_selectedAccount?.AccountType));
            AddInfoLine(doc, "Statut:", "Actif");
            AddInfoLine(doc, "Solde disponible:", $"{_selectedAccount?.Balance:N2} {_selectedAccount?.Currency.ToString() ?? "HTG"}");

            AddSpacing(doc, 40);
            AddParagraph(doc, "Ce certificat est délivré à la demande de l'intéressé(e) pour servir et valoir ce que de droit.", 13);

            // Footer
            AddDocumentFooter(doc);
        }

        private void GenerateContractPreview()
        {
            var doc = DocumentPreviewContent;

            // Header
            AddDocumentHeader(doc, "CONTRAT D'OUVERTURE DE COMPTE");

            // Parties
            AddBoldText(doc, "ENTRE LES SOUSSIGNÉS:", 14);
            AddSpacing(doc, 15);

            AddParagraph(doc, "D'une part, Nala Kredi Ti Machann, institution de microfinance, " +
                "ci-après dénommée \"l'Institution\",", 13);
            AddSpacing(doc, 10);

            AddParagraph(doc, $"Et d'autre part, {_selectedCustomer?.FullName ?? _selectedAccount?.CustomerName ?? "le client"}, " +
                $"ci-après dénommé(e) \"le Client\",", 13);

            AddSpacing(doc, 20);
            AddBoldText(doc, "IL A ÉTÉ CONVENU CE QUI SUIT:", 14);
            AddSpacing(doc, 15);

            // Articles
            AddBoldText(doc, "Article 1 - Objet du contrat", 13);
            AddParagraph(doc, $"Le présent contrat a pour objet l'ouverture d'un compte d'épargne " +
                $"numéro {_selectedAccount?.AccountNumber ?? "_______________"} au nom du Client.", 12);
            AddSpacing(doc, 15);

            AddBoldText(doc, "Article 2 - Informations du compte", 13);
            AddInfoLine(doc, "Type de compte:", GetAccountTypeDisplay(_selectedAccount?.AccountType));
            AddInfoLine(doc, "Date d'ouverture:", _selectedAccount?.OpeningDate.ToString("dd/MM/yyyy") ?? "--");
            AddInfoLine(doc, "Devise:", _selectedAccount?.Currency.ToString() ?? "HTG");
            AddSpacing(doc, 15);

            AddBoldText(doc, "Article 3 - Engagements", 13);
            AddParagraph(doc, "Le Client s'engage à respecter les conditions générales de l'Institution " +
                "et à maintenir son compte en règle.", 12);

            AddSpacing(doc, 30);
            AddParagraph(doc, "Fait à Port-au-Prince, le " + DateTime.Now.ToString("dd MMMM yyyy"), 13);

            // Footer
            AddDocumentFooter(doc);
        }

        private void GenerateReceiptPreview()
        {
            var doc = DocumentPreviewContent;

            // Header
            AddDocumentHeader(doc, "REÇU DE TRANSACTION");

            AddSpacing(doc, 20);

            // Receipt number
            var receiptNumber = $"REC-{DateTime.Now:yyyyMMdd}-{new Random().Next(1000, 9999)}";
            AddBoldText(doc, $"Reçu N° {receiptNumber}", 16);
            AddSpacing(doc, 20);

            // Transaction details
            AddBoldText(doc, "Détails de la transaction:", 15);
            AddSpacing(doc, 10);
            AddInfoLine(doc, "Date:", DateTime.Now.ToString("dd/MM/yyyy HH:mm"));
            AddInfoLine(doc, "Type:", "Opération de compte");
            AddInfoLine(doc, "Compte:", _selectedAccount?.AccountNumber ?? "--");
            AddInfoLine(doc, "Client:", _selectedCustomer?.FullName ?? _selectedAccount?.CustomerName ?? "--");
            AddSpacing(doc, 20);

            AddBoldText(doc, "Montant:", 15);
            AddSpacing(doc, 10);
            AddParagraph(doc, $"{_selectedAccount?.Balance:N2} {_selectedAccount?.Currency}", 20);

            AddSpacing(doc, 30);
            AddParagraph(doc, "Merci de votre confiance.", 14, true);

            // Footer
            AddDocumentFooter(doc);
        }

        private void GenerateBalancePreview()
        {
            var doc = DocumentPreviewContent;

            // Header
            AddDocumentHeader(doc, "ATTESTATION DE SOLDE");

            AddSpacing(doc, 20);

            AddParagraph(doc, $"Je soussigné(e), en qualité de représentant(e) de Nala Kredi Ti Machann, " +
                $"certifie que le compte ci-dessous présente le solde suivant à la date du " +
                $"{DateTime.Now:dd/MM/yyyy}:", 15);

            AddSpacing(doc, 30);

            // Account info
            AddBoldText(doc, "Informations du compte:", 15);
            AddSpacing(doc, 10);
            AddInfoLine(doc, "Numéro de compte:", _selectedAccount?.AccountNumber ?? "--");
            AddInfoLine(doc, "Titulaire:", _selectedCustomer?.FullName ?? _selectedAccount?.CustomerName ?? "--");
            AddInfoLine(doc, "Type de compte:", GetAccountTypeDisplay(_selectedAccount?.AccountType));

            AddSpacing(doc, 30);

            // Balance - highlighted
            var balanceBorder = new Border
            {
                Background = new SolidColorBrush(Color.FromRgb(240, 253, 244)),
                BorderBrush = new SolidColorBrush(Color.FromRgb(16, 185, 129)),
                BorderThickness = new Thickness(2),
                CornerRadius = new CornerRadius(8),
                Padding = new Thickness(20),
                Margin = new Thickness(0, 0, 0, 20)
            };

            var balanceStack = new StackPanel();
            var balanceLabel = new TextBlock
            {
                Text = "SOLDE ACTUEL",
                FontSize = 14,
                FontWeight = FontWeights.SemiBold,
                Foreground = new SolidColorBrush(Color.FromRgb(100, 116, 139)),
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 0, 0, 10)
            };
            var balanceAmount = new TextBlock
            {
                Text = $"{_selectedAccount?.Balance:N2} {_selectedAccount?.Currency.ToString() ?? "HTG"}",
                FontSize = 32,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(Color.FromRgb(16, 185, 129)),
                HorizontalAlignment = HorizontalAlignment.Center
            };

            balanceStack.Children.Add(balanceLabel);
            balanceStack.Children.Add(balanceAmount);
            balanceBorder.Child = balanceStack;
            doc.Children.Add(balanceBorder);

            AddSpacing(doc, 20);
            AddParagraph(doc, "Cette attestation est valable uniquement à la date mentionnée ci-dessus.", 12, true);

            // Footer
            AddDocumentFooter(doc);
        }

        // Helper methods for document generation
        private void AddDocumentHeader(StackPanel doc, string title)
        {
            // Logo/Institution name
            var institutionName = new TextBlock
            {
                Text = "🏦 NALA KREDI TI MACHANN",
                FontSize = 20,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(Color.FromRgb(59, 130, 246)),
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 0, 0, 5)
            };
            doc.Children.Add(institutionName);

            var subtitle = new TextBlock
            {
                Text = "Institution de Microfinance",
                FontSize = 12,
                Foreground = new SolidColorBrush(Color.FromRgb(100, 116, 139)),
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 0, 0, 30)
            };
            doc.Children.Add(subtitle);

            // Divider
            var divider = new Border
            {
                Height = 2,
                Background = new SolidColorBrush(Color.FromRgb(226, 232, 240)),
                Margin = new Thickness(0, 0, 0, 30)
            };
            doc.Children.Add(divider);

            // Title
            var titleBlock = new TextBlock
            {
                Text = title,
                FontSize = 22,
                FontWeight = FontWeights.Bold,
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 0, 0, 30)
            };
            doc.Children.Add(titleBlock);
        }

        private void AddDocumentFooter(StackPanel doc)
        {
            AddSpacing(doc, 40);

            // Divider
            var divider = new Border
            {
                Height = 1,
                Background = new SolidColorBrush(Color.FromRgb(226, 232, 240)),
                Margin = new Thickness(0, 0, 0, 20)
            };
            doc.Children.Add(divider);

            // Date and signature
            AddParagraph(doc, $"Fait à Port-au-Prince, le {DateTime.Now:dd/MM/yyyy}", 12);
            AddSpacing(doc, 40);

            var signatureText = new TextBlock
            {
                Text = "________________________________\nSignature autorisée",
                FontSize = 11,
                TextAlignment = TextAlignment.Center,
                HorizontalAlignment = HorizontalAlignment.Center,
                Foreground = new SolidColorBrush(Color.FromRgb(100, 116, 139))
            };
            doc.Children.Add(signatureText);

            AddSpacing(doc, 30);

            // Footer info
            var footerInfo = new TextBlock
            {
                Text = "Nala Kredi Ti Machann | Port-au-Prince, Haïti | Tél: +509 XXXX-XXXX",
                FontSize = 10,
                TextAlignment = TextAlignment.Center,
                HorizontalAlignment = HorizontalAlignment.Center,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184))
            };
            doc.Children.Add(footerInfo);
        }

        private void AddBoldText(StackPanel doc, string text, double fontSize)
        {
            var textBlock = new TextBlock
            {
                Text = text,
                FontSize = fontSize,
                FontWeight = FontWeights.Bold,
                Margin = new Thickness(0, 0, 0, 5)
            };
            doc.Children.Add(textBlock);
        }

        private void AddParagraph(StackPanel doc, string text, double fontSize, bool italic = false)
        {
            var textBlock = new TextBlock
            {
                Text = text,
                FontSize = fontSize,
                TextWrapping = TextWrapping.Wrap,
                LineHeight = fontSize * 1.5,
                Margin = new Thickness(0, 0, 0, 10)
            };

            if (italic)
            {
                textBlock.FontStyle = FontStyles.Italic;
                textBlock.Foreground = new SolidColorBrush(Color.FromRgb(100, 116, 139));
            }

            doc.Children.Add(textBlock);
        }

        private void AddInfoLine(StackPanel doc, string label, string value)
        {
            var panel = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                Margin = new Thickness(0, 3, 0, 3)
            };

            var labelBlock = new TextBlock
            {
                Text = label,
                FontSize = 13,
                Width = 180,
                Foreground = new SolidColorBrush(Color.FromRgb(100, 116, 139))
            };

            var valueBlock = new TextBlock
            {
                Text = value,
                FontSize = 13,
                FontWeight = FontWeights.SemiBold
            };

            panel.Children.Add(labelBlock);
            panel.Children.Add(valueBlock);
            doc.Children.Add(panel);
        }

        private void AddSpacing(StackPanel doc, double height)
        {
            var spacer = new Border
            {
                Height = height
            };
            doc.Children.Add(spacer);
        }

        private void AddTableHeader(Grid grid, int row, int column, string text)
        {
            var border = new Border
            {
                Background = new SolidColorBrush(Color.FromRgb(71, 85, 105)),
                BorderBrush = new SolidColorBrush(Color.FromRgb(203, 213, 225)),
                BorderThickness = new Thickness(1),
                Padding = new Thickness(8)
            };

            var textBlock = new TextBlock
            {
                Text = text,
                FontSize = 12,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(Colors.White)
            };

            border.Child = textBlock;
            Grid.SetRow(border, row);
            Grid.SetColumn(border, column);
            grid.Children.Add(border);
        }

        private void AddTableCell(Grid grid, int row, int column, string text, string? color = null)
        {
            var border = new Border
            {
                Background = new SolidColorBrush(row % 2 == 0 ? Color.FromRgb(248, 250, 252) : Colors.White),
                BorderBrush = new SolidColorBrush(Color.FromRgb(226, 232, 240)),
                BorderThickness = new Thickness(1),
                Padding = new Thickness(8)
            };

            var textBlock = new TextBlock
            {
                Text = text,
                FontSize = 11,
                TextWrapping = TextWrapping.Wrap
            };

            if (!string.IsNullOrEmpty(color))
            {
                textBlock.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(color));
                textBlock.FontWeight = FontWeights.SemiBold;
            }

            border.Child = textBlock;
            Grid.SetRow(border, row);
            Grid.SetColumn(border, column);
            grid.Children.Add(border);
        }

        private string GetTransactionTypeDisplay(SavingsTransactionType type)
        {
            return type switch
            {
                SavingsTransactionType.Deposit => "Dépôt",
                SavingsTransactionType.Withdrawal => "Retrait",
                SavingsTransactionType.Interest => "Intérêt",
                SavingsTransactionType.Fee => "Frais",
                SavingsTransactionType.OpeningDeposit => "Dépôt ouverture",
                _ => "Autre"
            };
        }

        private async void PrintButton_Click(object sender, RoutedEventArgs e)
        {
            if (_selectedAccount == null || string.IsNullOrEmpty(_selectedDocumentType))
                return;

            try
            {
                // Generate preview first if not already visible
                if (PreviewScrollViewer.Visibility != Visibility.Visible)
                {
                    GenerateDocumentPreview();
                }

                // Get date range for Statement
                DateTime? startDate = null;
                DateTime? endDate = null;
                List<SavingsTransactionResponseDto>? transactions = null;

                if (_selectedDocumentType == "Statement")
                {
                    startDate = StartDatePicker.SelectedDate ?? DateTime.Now.AddDays(-30);
                    endDate = EndDatePicker.SelectedDate ?? DateTime.Now;

                    // Load transactions for Statement
                    var result = await _apiService.GetSavingsTransactionsAsync(
                        accountId: _selectedAccount.Id,
                        dateFrom: startDate,
                        dateTo: endDate,
                        page: 1,
                        pageSize: 100);

                    if (result.IsSuccess && result.Data?.Transactions != null)
                    {
                        transactions = result.Data.Transactions;
                    }
                }

                // Use DocumentPrinter to generate PDF and send to printer
                DocumentPrinter.PrintDocument(
                    _selectedDocumentType,
                    _selectedAccount,
                    _selectedCustomer,
                    startDate,
                    endDate,
                    transactions);

                StatusMessageText.Text = "Document envoyé à l'imprimante";
                StatusMessageText.Foreground = new SolidColorBrush(Color.FromRgb(16, 185, 129));
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'impression:\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void SavePdfButton_Click(object sender, RoutedEventArgs e)
        {
            if (_selectedAccount == null || string.IsNullOrEmpty(_selectedDocumentType))
                return;

            try
            {
                // Generate preview first if not already visible
                if (PreviewScrollViewer.Visibility != Visibility.Visible)
                {
                    GenerateDocumentPreview();
                }

                // Get date range for Statement
                DateTime? startDate = null;
                DateTime? endDate = null;
                List<SavingsTransactionResponseDto>? transactions = null;

                if (_selectedDocumentType == "Statement")
                {
                    startDate = StartDatePicker.SelectedDate ?? DateTime.Now.AddDays(-30);
                    endDate = EndDatePicker.SelectedDate ?? DateTime.Now;

                    // Load transactions for Statement
                    var result = await _apiService.GetSavingsTransactionsAsync(
                        accountId: _selectedAccount.Id,
                        dateFrom: startDate,
                        dateTo: endDate,
                        page: 1,
                        pageSize: 100);

                    if (result.IsSuccess && result.Data?.Transactions != null)
                    {
                        transactions = result.Data.Transactions;
                    }
                }

                // Use DocumentPrinter to generate and save PDF
                DocumentPrinter.GenerateAndSavePDF(
                    _selectedDocumentType,
                    _selectedAccount,
                    _selectedCustomer,
                    startDate,
                    endDate,
                    transactions);

                StatusMessageText.Text = "Document PDF enregistré avec succès";
                StatusMessageText.Foreground = new SolidColorBrush(Color.FromRgb(16, 185, 129));
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'enregistrement:\n{ex.Message}",
                    "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    }
}
