using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using Microsoft.Win32;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class CreateCustomerWindow : Window
    {
        private readonly ApiService _apiService;
        private string? _selectedDocumentPath;
        private string? _selectedSignaturePath;

        public CreateCustomerWindow(ApiService? apiService = null)
        {
            InitializeComponent();
            _apiService = apiService ?? AppServices.GetRequiredApiService();
            SetupEventHandlers();
        }

        private void SetupEventHandlers()
        {
            SaveButton.Click += SaveButton_Click;
            CancelButton.Click += CancelButton_Click;
            DocumentBrowseButton.Click += DocumentBrowseButton_Click;
            SignatureBrowseButton.Click += SignatureBrowseButton_Click;
        }

        private async void SaveButton_Click(object sender, RoutedEventArgs e)
        {
            if (!ValidateForm())
            {
                return;
            }

            try
            {
                SaveButton.IsEnabled = false;
                SaveButton.Content = "⏳ Enregistrement...";

                var dto = CreateCustomerDtoFromForm();

                var result = await _apiService.CreateSavingsCustomerAsync(dto);

                if (result.IsSuccess && result.Data != null)
                {
                    var uploadIssues = await UploadExtrasAsync(result.Data.Id);

                    var successMessage = "Client créé avec succès!";
                    if (!string.IsNullOrEmpty(uploadIssues))
                    {
                        successMessage += $"\nCependant: {uploadIssues}";
                    }

                    MessageBox.Show(successMessage, "Succès", MessageBoxButton.OK, MessageBoxImage.Information);
                    DialogResult = true;
                    Close();
                }
                else
                {
                    MessageBox.Show($"Erreur lors de la création du client: {result.ErrorMessage}", 
                                  "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur inattendue: {ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                SaveButton.IsEnabled = true;
                SaveButton.Content = "💾 Enregistrer";
            }
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
            Close();
        }

        private void DocumentBrowseButton_Click(object sender, RoutedEventArgs e)
        {
            var dialog = new OpenFileDialog
            {
                Filter = "Images ou PDF (*.jpg;*.jpeg;*.png;*.pdf)|*.jpg;*.jpeg;*.png;*.pdf",
                CheckFileExists = true
            };

            if (dialog.ShowDialog() == true)
            {
                _selectedDocumentPath = dialog.FileName;
                DocumentFileNameText.Text = Path.GetFileName(dialog.FileName);
            }
        }

        private void SignatureBrowseButton_Click(object sender, RoutedEventArgs e)
        {
            var dialog = new OpenFileDialog
            {
                Filter = "Images (*.jpg;*.jpeg;*.png)|*.jpg;*.jpeg;*.png",
                CheckFileExists = true
            };

            if (dialog.ShowDialog() == true)
            {
                _selectedSignaturePath = dialog.FileName;
                SignatureFileNameText.Text = Path.GetFileName(dialog.FileName);
            }
        }

        private async Task<string?> UploadExtrasAsync(string customerId)
        {
            var issues = new List<string>();

            if (!string.IsNullOrWhiteSpace(_selectedDocumentPath))
            {
                var docType = GetSelectedDocumentUploadType();
                var docResult = await _apiService.UploadSavingsCustomerDocumentAsync(
                    customerId,
                    docType,
                    "Document identité",
                    null,
                    _selectedDocumentPath);

                if (!docResult.IsSuccess)
                {
                    issues.Add($"Pièce: {docResult.ErrorMessage}");
                }
            }

            if (!string.IsNullOrWhiteSpace(_selectedSignaturePath))
            {
                try
                {
                    var bytes = File.ReadAllBytes(_selectedSignaturePath);
                    var mime = GetMimeTypeFromExtension(Path.GetExtension(_selectedSignaturePath));
                    var base64 = Convert.ToBase64String(bytes);
                    var payload = string.IsNullOrEmpty(mime)
                        ? base64
                        : $"data:{mime};base64,{base64}";

                    var sigResult = await _apiService.UploadSavingsCustomerSignatureAsync(customerId, payload);
                    if (!sigResult.IsSuccess)
                    {
                        issues.Add($"Signature: {sigResult.ErrorMessage}");
                    }
                }
                catch (Exception ex)
                {
                    issues.Add($"Signature: {ex.Message}");
                }
            }

            return issues.Count == 0 ? null : string.Join("; ", issues);
        }

        private SavingsCustomerDocumentType GetSelectedDocumentUploadType()
        {
            return DocumentUploadTypeComboBox.SelectedIndex switch
            {
                0 => SavingsCustomerDocumentType.IdentityCardFront,
                1 => SavingsCustomerDocumentType.IdentityCardBack,
                2 => SavingsCustomerDocumentType.PassportPhoto,
                3 => SavingsCustomerDocumentType.ProofOfResidence,
                4 => SavingsCustomerDocumentType.Photo,
                _ => SavingsCustomerDocumentType.Other
            };
        }

        private static string GetMimeTypeFromExtension(string? extension)
        {
            if (string.IsNullOrWhiteSpace(extension)) return string.Empty;

            return extension.ToLowerInvariant() switch
            {
                ".jpg" => "image/jpeg",
                ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".pdf" => "application/pdf",
                _ => string.Empty
            };
        }

        private bool ValidateForm()
        {
            // Required fields validation
            if (string.IsNullOrWhiteSpace(FirstNameTextBox.Text))
            {
                MessageBox.Show("Le prénom est obligatoire.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                FirstNameTextBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(LastNameTextBox.Text))
            {
                MessageBox.Show("Le nom est obligatoire.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                LastNameTextBox.Focus();
                return false;
            }

            if (!DateOfBirthPicker.SelectedDate.HasValue)
            {
                MessageBox.Show("La date de naissance est obligatoire.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                DateOfBirthPicker.Focus();
                return false;
            }

            if (GenderComboBox.SelectedItem == null)
            {
                MessageBox.Show("Le genre est obligatoire.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                GenderComboBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(StreetTextBox.Text))
            {
                MessageBox.Show("La rue est obligatoire.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                StreetTextBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(CommuneTextBox.Text))
            {
                MessageBox.Show("La commune est obligatoire.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                CommuneTextBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(DepartmentTextBox.Text))
            {
                MessageBox.Show("Le département est obligatoire.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                DepartmentTextBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(PrimaryPhoneTextBox.Text))
            {
                MessageBox.Show("Le téléphone principal est obligatoire.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                PrimaryPhoneTextBox.Focus();
                return false;
            }

            if (DocumentTypeComboBox.SelectedItem == null)
            {
                MessageBox.Show("Le type de document est obligatoire.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                DocumentTypeComboBox.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(DocumentNumberTextBox.Text))
            {
                MessageBox.Show("Le numéro du document est obligatoire.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                DocumentNumberTextBox.Focus();
                return false;
            }

            if (!IssuedDatePicker.SelectedDate.HasValue)
            {
                MessageBox.Show("La date d'émission est obligatoire.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                IssuedDatePicker.Focus();
                return false;
            }

            if (string.IsNullOrWhiteSpace(IssuingAuthorityTextBox.Text))
            {
                MessageBox.Show("L'autorité émettrice est obligatoire.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                IssuingAuthorityTextBox.Focus();
                return false;
            }

            if (!AcceptTermsCheckBox.IsChecked.HasValue || !AcceptTermsCheckBox.IsChecked.Value)
            {
                MessageBox.Show("Vous devez accepter les termes et conditions.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                AcceptTermsCheckBox.Focus();
                return false;
            }

            return true;
        }

        private SavingsCustomerCreateDto CreateCustomerDtoFromForm()
        {
            var gender = GenderComboBox.SelectedIndex == 0 ? SavingsGender.Male : SavingsGender.Female;
            var documentType = DocumentTypeComboBox.SelectedIndex switch
            {
                0 => SavingsIdentityDocumentType.NationalId,
                1 => SavingsIdentityDocumentType.Passport,
                2 => SavingsIdentityDocumentType.DriversLicense,
                _ => SavingsIdentityDocumentType.NationalId
            };

            decimal? monthlyIncome = null;
            if (decimal.TryParse(MonthlyIncomeTextBox.Text, out var income))
            {
                monthlyIncome = income;
            }

            // Auto-generate customer code if not provided
            var customerCode = string.IsNullOrWhiteSpace(CustomerCodeTextBox.Text) 
                ? GenerateCustomerCode(FirstNameTextBox.Text.Trim(), LastNameTextBox.Text.Trim())
                : CustomerCodeTextBox.Text.Trim();

            return new SavingsCustomerCreateDto
            {
                CustomerCode = customerCode,
                FirstName = FirstNameTextBox.Text.Trim(),
                LastName = LastNameTextBox.Text.Trim(),
                DateOfBirth = DateOfBirthPicker.SelectedDate.Value.ToString("yyyy-MM-dd"),
                Gender = gender,
                Street = StreetTextBox.Text.Trim(),
                Commune = CommuneTextBox.Text.Trim(),
                Department = DepartmentTextBox.Text.Trim(),
                PostalCode = string.IsNullOrWhiteSpace(PostalCodeTextBox.Text) ? null : PostalCodeTextBox.Text.Trim(),
                PrimaryPhone = PrimaryPhoneTextBox.Text.Trim(),
                SecondaryPhone = string.IsNullOrWhiteSpace(SecondaryPhoneTextBox.Text) ? null : SecondaryPhoneTextBox.Text.Trim(),
                Email = string.IsNullOrWhiteSpace(EmailTextBox.Text) ? null : EmailTextBox.Text.Trim(),
                DocumentType = documentType,
                DocumentNumber = DocumentNumberTextBox.Text.Trim(),
                IssuedDate = IssuedDatePicker.SelectedDate.Value.ToString("yyyy-MM-dd"),
                ExpiryDate = ExpiryDatePicker.SelectedDate?.ToString("yyyy-MM-dd"),
                IssuingAuthority = IssuingAuthorityTextBox.Text.Trim(),
                Occupation = string.IsNullOrWhiteSpace(OccupationTextBox.Text) ? null : OccupationTextBox.Text.Trim(),
                MonthlyIncome = monthlyIncome,
                EmployerName = string.IsNullOrWhiteSpace(EmployerNameTextBox.Text) ? null : EmployerNameTextBox.Text.Trim(),
                WorkAddress = string.IsNullOrWhiteSpace(WorkAddressTextBox.Text) ? null : WorkAddressTextBox.Text.Trim(),
                BirthPlace = string.IsNullOrWhiteSpace(BirthPlaceTextBox.Text) ? null : BirthPlaceTextBox.Text.Trim(),
                AcceptTerms = AcceptTermsCheckBox.IsChecked ?? false
            };
        }

        // Generate a unique customer code: First letter of last name + First letter of first name + 4 random digits
        private string GenerateCustomerCode(string firstName, string lastName)
        {
            var firstInitial = string.IsNullOrEmpty(firstName) ? "X" : firstName[0].ToString().ToUpper();
            var lastInitial = string.IsNullOrEmpty(lastName) ? "X" : lastName[0].ToString().ToUpper();
            var random = new Random();
            var randomDigits = random.Next(1000, 10000); // 4 digits between 1000 and 9999
            return $"{lastInitial}{firstInitial}{randomDigits}";
        }
    }
}