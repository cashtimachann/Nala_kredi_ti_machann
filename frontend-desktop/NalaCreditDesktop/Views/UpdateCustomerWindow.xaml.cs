using System;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;

namespace NalaCreditDesktop.Views
{
    public partial class UpdateCustomerWindow : Window
    {
        private readonly ApiService _apiService;
        private SavingsCustomerResponseDto? _customer;

        public UpdateCustomerWindow(ApiService apiService)
        {
            InitializeComponent();
            _apiService = apiService ?? throw new ArgumentNullException(nameof(apiService));
            WireEvents();
        }

        private void WireEvents()
        {
            SearchButton.Click += async (_, __) => await LoadCustomerAsync();
            SaveButton.Click += async (_, __) => await SaveAsync();
            CancelButton.Click += (_, __) => Close();
        }

        private async Task LoadCustomerAsync()
        {
            try
            {
                StatusText.Text = string.Empty;
                SaveButton.IsEnabled = true;
                var term = SearchTextBox.Text?.Trim();
                if (string.IsNullOrWhiteSpace(term))
                {
                    StatusText.Text = "Saisissez l'ID ou le code client";
                    return;
                }

                var result = await _apiService.GetSavingsCustomerByIdAsync(term);
                if (!result.IsSuccess || result.Data == null)
                {
                    // Try search endpoint as fallback
                    var search = await _apiService.SearchSavingsCustomersAsync(term);
                    var customer = search.IsSuccess ? search.Data?.FirstOrDefault() : null;
                    if (customer == null)
                    {
                        StatusText.Text = result.ErrorMessage ?? "Client introuvable";
                        return;
                    }
                    _customer = customer;
                }
                else
                {
                    _customer = result.Data;
                }

                PopulateFields();
                StatusText.Text = "Client chargé";
            }
            catch (Exception ex)
            {
                StatusText.Text = $"Erreur : {ex.Message}";
            }
        }

        private void PopulateFields()
        {
            if (_customer == null) return;

            FirstNameTextBox.Text = _customer.FirstName;
            LastNameTextBox.Text = _customer.LastName;
            BirthDatePicker.SelectedDate = _customer.DateOfBirth;
            GenderComboBox.SelectedIndex = _customer.Gender == SavingsGender.Female ? 1 : 0;
            IsActiveCheckBox.IsChecked = _customer.IsActive;

            PrimaryPhoneTextBox.Text = _customer.Contact.PrimaryPhone;
            SecondaryPhoneTextBox.Text = _customer.Contact.SecondaryPhone;
            EmailTextBox.Text = _customer.Contact.Email;
            EmergencyNameTextBox.Text = _customer.Contact.EmergencyContactName;
            EmergencyPhoneTextBox.Text = _customer.Contact.EmergencyContactPhone;

            StreetTextBox.Text = _customer.Address.Street;
            CommuneTextBox.Text = _customer.Address.Commune;
            DepartmentTextBox.Text = _customer.Address.Department;
            PostalCodeTextBox.Text = _customer.Address.PostalCode;

            DocumentNumberTextBox.Text = _customer.Identity.DocumentNumber;
            IssuedDatePicker.SelectedDate = _customer.Identity.IssuedDate;
            ExpiryDatePicker.SelectedDate = _customer.Identity.ExpiryDate;
            IssuingAuthorityTextBox.Text = _customer.Identity.IssuingAuthority;
            DocumentTypeComboBox.SelectedIndex = MapDocumentTypeIndex(_customer.Identity.DocumentType);

            OccupationTextBox.Text = _customer.Occupation;
            MonthlyIncomeTextBox.Text = _customer.MonthlyIncome?.ToString(CultureInfo.InvariantCulture) ?? string.Empty;
        }

        private int MapDocumentTypeIndex(string documentType)
        {
            if (string.IsNullOrWhiteSpace(documentType)) return 0;
            return documentType.ToLowerInvariant() switch
            {
                "passport" => 1,
                "driverslicense" => 2,
                _ => 0 // default to NationalId / CIN
            };
        }

        private SavingsIdentityDocumentType MapDocumentType()
        {
            var selected = DocumentTypeComboBox.SelectedItem as ComboBoxItem;
            var tag = selected?.Tag?.ToString() ?? "NationalId";
            return tag.ToLowerInvariant() switch
            {
                "passport" => SavingsIdentityDocumentType.Passport,
                "driverslicense" => SavingsIdentityDocumentType.DriversLicense,
                _ => SavingsIdentityDocumentType.NationalId
            };
        }

        private async Task SaveAsync()
        {
            if (_customer == null)
            {
                StatusText.Text = "Chargez d'abord un client";
                return;
            }

            try
            {
                var dto = BuildUpdateDto();
                var result = await _apiService.UpdateSavingsCustomerAsync(_customer.Id, dto);
                if (result.IsSuccess)
                {
                    StatusText.Text = "Mise à jour effectuée";
                    _customer = result.Data;
                    SaveButton.IsEnabled = false;
                }
                else
                {
                    StatusText.Text = result.ErrorMessage ?? "Échec de la mise à jour";
                }
            }
            catch (Exception ex)
            {
                StatusText.Text = $"Erreur : {ex.Message}";
            }
        }

        private SavingsCustomerUpdateDto BuildUpdateDto()
        {
            var dto = new SavingsCustomerUpdateDto
            {
                CustomerCode = _customer?.CustomerCode,
                FirstName = FirstNameTextBox.Text?.Trim() ?? string.Empty,
                LastName = LastNameTextBox.Text?.Trim() ?? string.Empty,
                DateOfBirth = BirthDatePicker.SelectedDate?.ToString("yyyy-MM-dd") ?? _customer?.DateOfBirth.ToString("yyyy-MM-dd") ?? DateTime.Now.ToString("yyyy-MM-dd"),
                Gender = GenderComboBox.SelectedIndex == 1 ? SavingsGender.Female : SavingsGender.Male,
                Street = StreetTextBox.Text?.Trim() ?? string.Empty,
                Commune = CommuneTextBox.Text?.Trim() ?? string.Empty,
                Department = DepartmentTextBox.Text?.Trim() ?? string.Empty,
                PostalCode = PostalCodeTextBox.Text?.Trim(),
                PrimaryPhone = PrimaryPhoneTextBox.Text?.Trim() ?? string.Empty,
                SecondaryPhone = SecondaryPhoneTextBox.Text?.Trim(),
                Email = EmailTextBox.Text?.Trim(),
                EmergencyContactName = EmergencyNameTextBox.Text?.Trim(),
                EmergencyContactPhone = EmergencyPhoneTextBox.Text?.Trim(),
                DocumentType = MapDocumentType(),
                DocumentNumber = DocumentNumberTextBox.Text?.Trim() ?? string.Empty,
                IssuedDate = IssuedDatePicker.SelectedDate?.ToString("yyyy-MM-dd") ?? _customer?.Identity.IssuedDate.ToString("yyyy-MM-dd") ?? DateTime.Now.ToString("yyyy-MM-dd"),
                ExpiryDate = ExpiryDatePicker.SelectedDate?.ToString("yyyy-MM-dd"),
                IssuingAuthority = IssuingAuthorityTextBox.Text?.Trim() ?? string.Empty,
                Occupation = OccupationTextBox.Text?.Trim(),
                MonthlyIncome = ParseDecimal(MonthlyIncomeTextBox.Text),
                AcceptTerms = true,
                IsActive = IsActiveCheckBox.IsChecked == true
            };

            return dto;
        }

        private decimal? ParseDecimal(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            if (decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var result))
                return result;
            return null;
        }
    }
}
