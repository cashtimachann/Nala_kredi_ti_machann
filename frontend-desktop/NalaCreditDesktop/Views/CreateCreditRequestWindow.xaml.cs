using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using Microsoft.Win32;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class CreateCreditRequestWindow : Window
    {
        private readonly ApiService _apiService;
        private string? _verifiedAccountNumber;
        private string? _customerName;
        private string? _customerPhone;
        private string? _customerEmail;
        private SavingsAccountInfo? _accountInfo;
        private int? _accountBranchId;
        
        // Document file paths
        private string? _nationalIdFilePath;
        private string? _proofOfResidenceFilePath;
        private string? _proofOfIncomeFilePath;
        private string? _collateralDocsFilePath;

        public CreateCreditRequestWindow(ApiService? apiService = null)
        {
            InitializeComponent();
            _apiService = apiService ?? ((App)Application.Current).ApiService;
            SetupEventHandlers();
            InitializeDefaults();
        }

        private void SetupEventHandlers()
        {
            CancelButton.Click += CancelButton_Click;
            SubmitRequestButton.Click += SubmitRequestButton_Click;
            VerifyAccountButton.Click += VerifyAccountButton_Click;
        }

        private void CollateralTypeComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            // Si "Épargne bloquée" est sélectionné (index 5) et qu'on a un compte vérifié
            if (CollateralTypeComboBox.SelectedIndex == 5 && _accountInfo != null)
            {
                // Auto-populate avec le solde du compte
                CollateralValueTextBox.Text = _accountInfo.Balance.ToString("0.00");
                CollateralValueTextBox.IsReadOnly = true;
                CollateralValueTextBox.Background = new System.Windows.Media.SolidColorBrush(
                    (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString("#F8FAFC"));
                
                // Suggestion pour la description
                if (string.IsNullOrWhiteSpace(CollateralDescriptionTextBox.Text))
                {
                    CollateralDescriptionTextBox.Text = $"Épargne bloquée - Compte {_verifiedAccountNumber} - Solde: {_accountInfo.Balance:N2} {_accountInfo.Currency}";
                }
            }
            else
            {
                // Réinitialiser pour les autres types de garantie
                CollateralValueTextBox.IsReadOnly = false;
                CollateralValueTextBox.Background = System.Windows.Media.Brushes.White;
            }
        }

        private void InitializeDefaults()
        {
            // Set default currency to HTG
            CurrencyComboBox.SelectedIndex = 0;
            // Set default loan type to Personal
            LoanTypeComboBox.SelectedIndex = 0;
            // Set default duration to 12 months (index 4 since 1,3,6,9,12...)
            DurationComboBox.SelectedIndex = 4;
            
            // Load and display branch information
            LoadBranchInfo();
        }
        
        private void LoadBranchInfo()
        {
            try
            {
                var branchId = _apiService.CurrentUser?.BranchId;
                var branchName = _apiService.CurrentUser?.BranchName;
                
                if (branchId.HasValue && !string.IsNullOrEmpty(branchName))
                {
                    BranchTextBox.Text = $"{branchName} (ID: {branchId})";
                }
                else
                {
                    BranchTextBox.Text = "Succursale non définie";
                }
            }
            catch
            {
                BranchTextBox.Text = "Erreur de chargement";
            }
        }

        private async void VerifyAccountButton_Click(object sender, RoutedEventArgs e)
        {
            var accountNumber = AccountNumberTextBox.Text?.Trim();
            if (string.IsNullOrWhiteSpace(accountNumber))
            {
                MessageBox.Show("Veuillez entrer un numéro de compte.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                AccountNumberTextBox.Focus();
                return;
            }

            // Check if user is authenticated
            if (!_apiService.IsAuthenticated)
            {
                MessageBox.Show("Vous devez être connecté pour vérifier un compte.\n\nVeuillez fermer cette fenêtre et vous connecter d'abord.", 
                              "Non Connecté", MessageBoxButton.OK, MessageBoxImage.Warning);
                AccountInfoText.Text = "❌ Session expirée - Veuillez vous reconnecter";
                return;
            }

            try
            {
                VerifyAccountButton.IsEnabled = false;
                VerifyAccountButton.Content = "⏳ Vérification...";

                var result = await _apiService.GetSavingsAccountByNumberAsync(accountNumber);

                if (result.IsSuccess && result.Data != null)
                {
                    _verifiedAccountNumber = accountNumber;
                    _customerName = result.Data.CustomerName;
                    _customerPhone = result.Data.Customer?.Contact.PrimaryPhone;
                    _customerEmail = result.Data.Customer?.Contact?.Email;
                    _accountInfo = result.Data;
                    _accountBranchId = result.Data.BranchId;

                    AccountInfoText.Text = $"✅ Compte vérifié\n" +
                                         $"Client: {_customerName}\n" +
                                         $"Solde: {result.Data.Balance:N2} {result.Data.Currency}\n" +
                                         $"Statut: {result.Data.Status}\n" +
                                         $"Succursale: {result.Data.BranchId} {result.Data.BranchName}";
                }
                else
                {
                    _verifiedAccountNumber = null;
                    _customerName = null;
                    _customerPhone = null;
                    _customerEmail = null;
                    _accountInfo = null;
                    _accountBranchId = null;
                    
                    var errorMsg = result.ErrorMessage ?? "Erreur inconnue";
                    if (errorMsg.Contains("Not Found", StringComparison.OrdinalIgnoreCase) || 
                        errorMsg.Contains("404", StringComparison.OrdinalIgnoreCase))
                    {
                        AccountInfoText.Text = $"❌ Compte '{accountNumber}' introuvable dans le système.\n\nVérifiez:\n• Le numéro de compte est correct\n• Le compte a été créé dans le système\n• Vous êtes dans la bonne succursale";
                    }
                    else if (errorMsg.Contains("Unauthorized", StringComparison.OrdinalIgnoreCase) || 
                             errorMsg.Contains("401", StringComparison.OrdinalIgnoreCase))
                    {
                        AccountInfoText.Text = "❌ Session expirée - Veuillez vous reconnecter";
                    }
                    else
                    {
                        AccountInfoText.Text = $"❌ Erreur: {errorMsg}";
                    }
                }
            }
            catch (Exception ex)
            {
                _verifiedAccountNumber = null;
                _customerName = null;
                _customerPhone = null;
                _customerEmail = null;
                _accountInfo = null;
                _accountBranchId = null;
                AccountInfoText.Text = $"❌ Erreur lors de la vérification: {ex.Message}";
            }
            finally
            {
                VerifyAccountButton.IsEnabled = true;
                VerifyAccountButton.Content = "✅ Vérifier";
            }
        }

        private async void SubmitRequestButton_Click(object sender, RoutedEventArgs e)
        {
            if (!ValidateForm())
            {
                return;
            }

            try
            {
                SubmitRequestButton.IsEnabled = false;
                SubmitRequestButton.Content = "⏳ Soumission...";

                var dto = CreateCreditRequestDtoFromForm();

                var result = await _apiService.CreateMicrocreditLoanApplicationAsync(dto);

                if (result.IsSuccess && !string.IsNullOrWhiteSpace(result.Data))
                {
                    var applicationId = result.Data;
                    
                    // Upload documents if any were selected
                    var documentErrors = new List<string>();
                    
                    if (!string.IsNullOrEmpty(_nationalIdFilePath))
                    {
                        SubmitRequestButton.Content = "⏳ Upload Carte d'Identité...";
                        var uploadResult = await _apiService.UploadMicrocreditDocumentAsync(
                            applicationId, _nationalIdFilePath, "IdCard", "Carte d'Identité Nationale");
                        if (!uploadResult.IsSuccess)
                            documentErrors.Add($"Carte d'Identité: {uploadResult.ErrorMessage}");
                    }
                    
                    if (!string.IsNullOrEmpty(_proofOfResidenceFilePath))
                    {
                        SubmitRequestButton.Content = "⏳ Upload Justificatif Domicile...";
                        var uploadResult = await _apiService.UploadMicrocreditDocumentAsync(
                            applicationId, _proofOfResidenceFilePath, "Other", "Justificatif de Domicile");
                        if (!uploadResult.IsSuccess)
                            documentErrors.Add($"Justificatif Domicile: {uploadResult.ErrorMessage}");
                    }
                    
                    if (!string.IsNullOrEmpty(_proofOfIncomeFilePath))
                    {
                        SubmitRequestButton.Content = "⏳ Upload Justificatif Revenus...";
                        var uploadResult = await _apiService.UploadMicrocreditDocumentAsync(
                            applicationId, _proofOfIncomeFilePath, "ProofOfIncome", "Justificatif de Revenus");
                        if (!uploadResult.IsSuccess)
                            documentErrors.Add($"Justificatif Revenus: {uploadResult.ErrorMessage}");
                    }
                    
                    if (!string.IsNullOrEmpty(_collateralDocsFilePath))
                    {
                        SubmitRequestButton.Content = "⏳ Upload Documents Garantie...";
                        var uploadResult = await _apiService.UploadMicrocreditDocumentAsync(
                            applicationId, _collateralDocsFilePath, "CollateralDocument", "Documents de Garantie");
                        if (!uploadResult.IsSuccess)
                            documentErrors.Add($"Documents Garantie: {uploadResult.ErrorMessage}");
                    }
                    
                    // Show success message with any document upload errors
                    var message = "Demande de crédit soumise avec succès!";
                    if (documentErrors.Any())
                    {
                        message += "\n\nErreurs upload documents:\n" + string.Join("\n", documentErrors);
                        MessageBox.Show(message, "Succès avec avertissements", MessageBoxButton.OK, MessageBoxImage.Warning);
                    }
                    else
                    {
                        MessageBox.Show(message, "Succès", MessageBoxButton.OK, MessageBoxImage.Information);
                    }
                    
                    DialogResult = true;
                    Close();
                }
                else
                {
                    MessageBox.Show($"Erreur lors de la soumission: {result.ErrorMessage}", 
                                  "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur inattendue: {ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                SubmitRequestButton.IsEnabled = true;
                SubmitRequestButton.Content = "📤 Soumettre Demande";
            }
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
            Close();
        }

        // Document upload handlers
        private void NationalIdUploadButton_Click(object sender, RoutedEventArgs e)
        {
            _nationalIdFilePath = SelectFile("Carte d'Identité Nationale");
            if (!string.IsNullOrEmpty(_nationalIdFilePath))
            {
                NationalIdFileLabel.Text = $"✓ Fichier: {Path.GetFileName(_nationalIdFilePath)}";
                NationalIdFileLabel.Visibility = Visibility.Visible;
                HasNationalIdCheckBox.IsChecked = true;
            }
        }

        private void ProofOfResidenceUploadButton_Click(object sender, RoutedEventArgs e)
        {
            _proofOfResidenceFilePath = SelectFile("Justificatif de Domicile");
            if (!string.IsNullOrEmpty(_proofOfResidenceFilePath))
            {
                ProofOfResidenceFileLabel.Text = $"✓ Fichier: {Path.GetFileName(_proofOfResidenceFilePath)}";
                ProofOfResidenceFileLabel.Visibility = Visibility.Visible;
                HasProofOfResidenceCheckBox.IsChecked = true;
            }
        }

        private void ProofOfIncomeUploadButton_Click(object sender, RoutedEventArgs e)
        {
            _proofOfIncomeFilePath = SelectFile("Justificatif de Revenus");
            if (!string.IsNullOrEmpty(_proofOfIncomeFilePath))
            {
                ProofOfIncomeFileLabel.Text = $"✓ Fichier: {Path.GetFileName(_proofOfIncomeFilePath)}";
                ProofOfIncomeFileLabel.Visibility = Visibility.Visible;
                HasProofOfIncomeCheckBox.IsChecked = true;
            }
        }

        private void CollateralDocsUploadButton_Click(object sender, RoutedEventArgs e)
        {
            _collateralDocsFilePath = SelectFile("Documents de Garantie");
            if (!string.IsNullOrEmpty(_collateralDocsFilePath))
            {
                CollateralDocsFileLabel.Text = $"✓ Fichier: {Path.GetFileName(_collateralDocsFilePath)}";
                CollateralDocsFileLabel.Visibility = Visibility.Visible;
                HasCollateralDocsCheckBox.IsChecked = true;
            }
        }

        private string? SelectFile(string title)
        {
            var openFileDialog = new OpenFileDialog
            {
                Title = $"Sélectionner {title}",
                Filter = "Fichiers image et PDF|*.jpg;*.jpeg;*.png;*.pdf|" +
                        "Images (*.jpg, *.jpeg, *.png)|*.jpg;*.jpeg;*.png|" +
                        "Documents PDF (*.pdf)|*.pdf|" +
                        "Tous les fichiers (*.*)|*.*",
                FilterIndex = 1,
                Multiselect = false
            };

            if (openFileDialog.ShowDialog() == true)
            {
                var fileInfo = new FileInfo(openFileDialog.FileName);
                
                // Check file size (max 5MB)
                if (fileInfo.Length > 5 * 1024 * 1024)
                {
                    MessageBox.Show("Le fichier est trop volumineux. Taille maximale: 5 MB", 
                                  "Fichier trop grand", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return null;
                }

                return openFileDialog.FileName;
            }

            return null;
        }

        private bool ValidateForm()
        {
            if (string.IsNullOrWhiteSpace(_verifiedAccountNumber))
            {
                MessageBox.Show("Veuillez vérifier le numéro de compte.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                AccountNumberTextBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(OccupationTextBox.Text))
            {
                MessageBox.Show("Veuillez entrer la profession du client.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                OccupationTextBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(AddressTextBox.Text) || AddressTextBox.Text.Length < 3)
            {
                MessageBox.Show("Veuillez entrer l'adresse complète du client (minimum 3 caractères).", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                AddressTextBox.Focus();
                return false;
            }

            if (LoanTypeComboBox.SelectedItem == null)
            {
                MessageBox.Show("Veuillez sélectionner un type de crédit.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                LoanTypeComboBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(RequestedAmountTextBox.Text) || 
                !decimal.TryParse(RequestedAmountTextBox.Text, out var amount) || amount <= 0)
            {
                MessageBox.Show("Veuillez entrer un montant demandé valide.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                RequestedAmountTextBox.Focus();
                return false;
            }

            if (CurrencyComboBox.SelectedItem == null)
            {
                MessageBox.Show("Veuillez sélectionner une devise.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                CurrencyComboBox.Focus();
                return false;
            }

            if (DurationComboBox.SelectedItem == null)
            {
                MessageBox.Show("Veuillez sélectionner une durée.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                DurationComboBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(PurposeTextBox.Text))
            {
                MessageBox.Show("Veuillez entrer l'objectif du crédit.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                PurposeTextBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(InterestRateTextBox.Text) || 
                !decimal.TryParse(InterestRateTextBox.Text, out var interestRate) || interestRate <= 0)
            {
                MessageBox.Show("Veuillez entrer un taux d'intérêt annuel valide.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                InterestRateTextBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(MonthlyInterestRateTextBox.Text) || 
                !decimal.TryParse(MonthlyInterestRateTextBox.Text, out var monthlyRate) || monthlyRate <= 0)
            {
                MessageBox.Show("Veuillez entrer un taux d'intérêt mensuel valide.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                MonthlyInterestRateTextBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(MonthlyIncomeTextBox.Text) || 
                !decimal.TryParse(MonthlyIncomeTextBox.Text, out var income) || income < 0)
            {
                MessageBox.Show("Veuillez entrer des revenus mensuels valides.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                MonthlyIncomeTextBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(MonthlyExpensesTextBox.Text) || 
                !decimal.TryParse(MonthlyExpensesTextBox.Text, out var expenses) || expenses < 0)
            {
                MessageBox.Show("Veuillez entrer des dépenses mensuelles valides.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                MonthlyExpensesTextBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(ExistingDebtsTextBox.Text) || 
                !decimal.TryParse(ExistingDebtsTextBox.Text, out var debts) || debts < 0)
            {
                MessageBox.Show("Veuillez entrer des dettes existantes valides.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                ExistingDebtsTextBox.Focus();
                return false;
            }

            // Validate collateral (now required)
            if (CollateralTypeComboBox.SelectedIndex < 0)
            {
                MessageBox.Show("Veuillez sélectionner un type de garantie.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                CollateralTypeComboBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(CollateralValueTextBox.Text) || 
                !decimal.TryParse(CollateralValueTextBox.Text, out var collateralValue) || collateralValue <= 0)
            {
                MessageBox.Show("Veuillez entrer une valeur de garantie valide.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                CollateralValueTextBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(CollateralDescriptionTextBox.Text) || CollateralDescriptionTextBox.Text.Length < 5)
            {
                MessageBox.Show("Veuillez entrer une description détaillée de la garantie (minimum 5 caractères).", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                CollateralDescriptionTextBox.Focus();
                return false;
            }

            // Validate guarantors (now required)
            if (string.IsNullOrWhiteSpace(Guarantor1NameTextBox.Text))
            {
                MessageBox.Show("Veuillez entrer le nom du garant principal.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                Guarantor1NameTextBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(Guarantor1PhoneTextBox.Text))
            {
                MessageBox.Show("Veuillez entrer le téléphone du garant principal.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                Guarantor1PhoneTextBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(Guarantor1RelationTextBox.Text))
            {
                MessageBox.Show("Veuillez entrer la relation avec le garant principal.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                Guarantor1RelationTextBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(Reference1NameTextBox.Text))
            {
                MessageBox.Show("Veuillez entrer le nom de la référence 1.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                Reference1NameTextBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(Reference1PhoneTextBox.Text))
            {
                MessageBox.Show("Veuillez entrer le téléphone de la référence 1.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                Reference1PhoneTextBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(Reference2NameTextBox.Text))
            {
                MessageBox.Show("Veuillez entrer le nom de la référence 2.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                Reference2NameTextBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(Reference2PhoneTextBox.Text))
            {
                MessageBox.Show("Veuillez entrer le téléphone de la référence 2.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                Reference2PhoneTextBox.Focus();
                return false;
            }

            if (!TermsCheckBox.IsChecked.HasValue || !TermsCheckBox.IsChecked.Value)
            {
                MessageBox.Show("Vous devez accepter les termes et conditions.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                TermsCheckBox.Focus();
                return false;
            }

            return true;
        }

        private CreateMicrocreditLoanApplicationDto CreateCreditRequestDtoFromForm()
        {
            // Map ComboBox indices to available enum values
            // Since we have 13 types in UI but only 9 in enum, we'll map to closest match
            var loanType = LoanTypeComboBox.SelectedIndex switch
            {
                0 => MicrocreditLoanType.Business,      // Crédit Commercial
                1 => MicrocreditLoanType.Agriculture,   // Crédit Agricole (Standard)
                2 => MicrocreditLoanType.Personal,      // Crédit Personnel (Standard)
                3 => MicrocreditLoanType.Personal,      // Crédit d'Urgence -> Personal
                4 => MicrocreditLoanType.Housing,       // Crédit Loyer -> Housing
                5 => MicrocreditLoanType.CreditAuto,    // Crédit Auto
                6 => MicrocreditLoanType.CreditMoto,    // Crédit Moto
                7 => MicrocreditLoanType.Personal,      // Crédit Personnel
                8 => MicrocreditLoanType.Education,     // Crédit Scolaire -> Education
                9 => MicrocreditLoanType.Agriculture,   // Crédit Agricole
                10 => MicrocreditLoanType.Business,     // Crédit Professionnel -> Business
                11 => MicrocreditLoanType.Personal,     // Crédit d'Appui -> Personal
                12 => MicrocreditLoanType.Housing,      // Crédit Hypothécaire -> Housing
                _ => MicrocreditLoanType.Personal
            };

            var currency = CurrencyComboBox.SelectedIndex == 0 ? MicrocreditCurrency.HTG : MicrocreditCurrency.USD;

            int duration = int.Parse((DurationComboBox.SelectedItem as ComboBoxItem)?.Content.ToString() ?? "12");

            int branchId = _apiService.CurrentUser?.BranchId
                ?? _accountBranchId
                ?? 1;

            decimal? collateralValue = null;
            if (!string.IsNullOrWhiteSpace(CollateralValueTextBox.Text) && 
                decimal.TryParse(CollateralValueTextBox.Text, out var value))
            {
                collateralValue = value;
            }

            int dependents = 0;
            if (!string.IsNullOrWhiteSpace(DependentsTextBox.Text) && 
                int.TryParse(DependentsTextBox.Text, out var dep))
            {
                dependents = dep;
            }

            return new CreateMicrocreditLoanApplicationDto
            {
                SavingsAccountNumber = _verifiedAccountNumber!,
                LoanType = loanType,
                RequestedAmount = decimal.Parse(RequestedAmountTextBox.Text),
                RequestedDurationMonths = duration,
                Purpose = PurposeTextBox.Text.Trim(),
                BusinessPlan = string.IsNullOrWhiteSpace(BusinessPlanTextBox.Text) ? null : BusinessPlanTextBox.Text.Trim(),
                Currency = currency,
                BranchId = branchId,
                CustomerName = _customerName,
                Phone = _customerPhone,
                Email = string.IsNullOrWhiteSpace(EmailTextBox.Text) ? _customerEmail : EmailTextBox.Text.Trim(),
                CustomerAddress = AddressTextBox.Text.Trim(),
                Occupation = OccupationTextBox.Text.Trim(),
                MonthlyIncome = decimal.Parse(MonthlyIncomeTextBox.Text),
                MonthlyExpenses = decimal.Parse(MonthlyExpensesTextBox.Text),
                ExistingDebts = decimal.Parse(ExistingDebtsTextBox.Text),
                CollateralValue = collateralValue,
                Dependents = dependents,
                InterestRate = decimal.Parse(InterestRateTextBox.Text) / 100m,  // Convert percentage to decimal (3.5% -> 0.035)
                MonthlyInterestRate = decimal.Parse(MonthlyInterestRateTextBox.Text) / 100m,  // Convert percentage to decimal
                CollateralType = CollateralTypeComboBox.SelectedItem != null 
                    ? ((ComboBoxItem)CollateralTypeComboBox.SelectedItem).Content.ToString() 
                    : null,
                CollateralDescription = string.IsNullOrWhiteSpace(CollateralDescriptionTextBox.Text) ? null : CollateralDescriptionTextBox.Text.Trim(),
                Guarantor1Name = string.IsNullOrWhiteSpace(Guarantor1NameTextBox.Text) ? null : Guarantor1NameTextBox.Text.Trim(),
                Guarantor1Phone = string.IsNullOrWhiteSpace(Guarantor1PhoneTextBox.Text) ? null : Guarantor1PhoneTextBox.Text.Trim(),
                Guarantor1Relation = string.IsNullOrWhiteSpace(Guarantor1RelationTextBox.Text) ? null : Guarantor1RelationTextBox.Text.Trim(),
                Guarantor2Name = string.IsNullOrWhiteSpace(Guarantor2NameTextBox.Text) ? null : Guarantor2NameTextBox.Text.Trim(),
                Guarantor2Phone = string.IsNullOrWhiteSpace(Guarantor2PhoneTextBox.Text) ? null : Guarantor2PhoneTextBox.Text.Trim(),
                Guarantor2Relation = string.IsNullOrWhiteSpace(Guarantor2RelationTextBox.Text) ? null : Guarantor2RelationTextBox.Text.Trim(),
                Reference1Name = Reference1NameTextBox.Text.Trim(),
                Reference1Phone = Reference1PhoneTextBox.Text.Trim(),
                Reference2Name = Reference2NameTextBox.Text.Trim(),
                Reference2Phone = Reference2PhoneTextBox.Text.Trim(),
                HasNationalId = HasNationalIdCheckBox.IsChecked ?? false,
                HasProofOfResidence = HasProofOfResidenceCheckBox.IsChecked ?? false,
                HasProofOfIncome = HasProofOfIncomeCheckBox.IsChecked ?? false,
                HasCollateralDocs = HasCollateralDocsCheckBox.IsChecked ?? false,
                Notes = string.IsNullOrWhiteSpace(NotesTextBox.Text) ? null : NotesTextBox.Text.Trim()
            };
        }
    }
}