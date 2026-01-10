using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using NalaCreditDesktop.Services;
using NalaCreditDesktop.Models;

namespace NalaCreditDesktop.Views
{
    public partial class MyApplicationsWindow : Window
    {
        private readonly ApiService _apiService;
        private readonly ObservableCollection<ApplicationItem> _items = new();
        private int _currentPage = 1;
        private int _totalPages = 1;
        private int _totalCount = 0;
        private int _pageSize = 50;
        private readonly string? _initialStatus;

        public MyApplicationsWindow(ApiService apiService, int? branchId = null, string? branchName = null, 
            string? loanOfficerId = null, string? initialStatus = null)
        {
            InitializeComponent();
            _apiService = apiService;
            _initialStatus = initialStatus;

            // Set branch info if provided
            if (!string.IsNullOrEmpty(branchName))
            {
                BranchText.Text = $"Succursale: {branchName}";
            }

            ApplicationsDataGrid.ItemsSource = _items;

            RefreshButton.Click += async (_, __) => await LoadAsync(_currentPage, _pageSize);
            CloseButton.Click += (_, __) => this.Close();
            SearchButton.Click += (_, __) => ApplySearch();

            ApplyFiltersButton.Click += async (_, __) => { _currentPage = 1; await LoadAsync(_currentPage, _pageSize); };
            PrevPageButton.Click += async (_, __) => { if (_currentPage > 1) { _currentPage--; await LoadAsync(_currentPage, _pageSize); } };
            NextPageButton.Click += async (_, __) => { if (_currentPage < _totalPages) { _currentPage++; await LoadAsync(_currentPage, _pageSize); } };

            StatusCombo.SelectionChanged += async (_, __) => { _currentPage = 1; await LoadAsync(_currentPage, _pageSize); };
            LoanTypeCombo.SelectionChanged += async (_, __) => { _currentPage = 1; await LoadAsync(_currentPage, _pageSize); };
            PageSizeCombo.SelectionChanged += async (_, __) => { _pageSize = GetSelectedPageSize(); _currentPage = 1; await LoadAsync(_currentPage, _pageSize); };

            Loaded += async (_, __) => await InitializeAsync();
        }

        private async Task InitializeAsync()
        {
            var user = _apiService.CurrentUser;
            if (BranchText.Text == "Succursale")
            {
                BranchText.Text = user?.BranchName != null ? $"Succursale: {user.BranchName}" : "Succursale: N/A";
            }
            
            // Apply initial status filter if provided
            if (!string.IsNullOrEmpty(_initialStatus))
            {
                for (int i = 0; i < StatusCombo.Items.Count; i++)
                {
                    if (StatusCombo.Items[i] is System.Windows.Controls.ComboBoxItem item && 
                        item.Tag?.ToString() == _initialStatus)
                    {
                        StatusCombo.SelectedIndex = i;
                        break;
                    }
                }
            }
            
            // Initialize defaults
            _pageSize = GetSelectedPageSize();
            await LoadAsync(_currentPage, _pageSize);
        }

        private async Task LoadAsync(int page = 1, int pageSize = 50)
        {
            try
            {
                StatusText.Text = "Chargement des demandes...";
                var branchId = _apiService.CurrentUser?.BranchId;
                var status = GetSelectedStatus();
                var loanType = GetSelectedLoanType();
                var result = await _apiService.GetMicrocreditApplicationsAsync(
                    page: page,
                    pageSize: pageSize,
                    status: status,
                    loanType: loanType,
                    branchId: branchId,
                    loanOfficerId: null);

                // Fallback retry if backend rejects provided filter values
                if (!result.IsSuccess && (ContainsNotValidMessage(result.ErrorMessage)))
                {
                    var altStatus = GetStatusAlternatives(status);
                    var altType = GetLoanTypeAlternatives(loanType);

                    foreach (var s in altStatus)
                    {
                        foreach (var t in altType)
                        {
                            var retry = await _apiService.GetMicrocreditApplicationsAsync(
                                page: page,
                                pageSize: pageSize,
                                status: s,
                                loanType: t,
                                branchId: branchId,
                                loanOfficerId: null);
                            if (retry.IsSuccess)
                            {
                                result = retry;
                                goto AfterFetch;
                            }
                        }
                    }
                }

            AfterFetch:
                _items.Clear();

                if (result.IsSuccess && result.Data != null)
                {
                    foreach (var app in result.Data.Applications)
                    {
                        _items.Add(new ApplicationItem
                        {
                            Id = app.Id,
                            ApplicationNumber = app.ApplicationNumber,
                            CustomerName = app.CustomerName,
                            RequestedAmount = app.RequestedAmount,
                            RequestedDurationMonths = app.RequestedDurationMonths,
                            LoanTypeDisplay = FormatLoanType(app.LoanType),
                            StatusDisplay = FormatStatus(app.Status),
                            CreatedAt = app.CreatedAt
                        });
                    }

                    _currentPage = result.Data.Page;
                    _totalPages = result.Data.TotalPages;
                    _totalCount = result.Data.TotalCount;
                    _pageSize = result.Data.PageSize;

                    PageInfoText.Text = $"Page {_currentPage} / {_totalPages}";
                    PrevPageButton.IsEnabled = _currentPage > 1;
                    NextPageButton.IsEnabled = _currentPage < _totalPages;
                    StatusText.Text = $"Total: {_totalCount} • Page {_currentPage}/{_totalPages} • Par page: {_pageSize}";
                }
                else
                {
                    StatusText.Text = result.ErrorMessage ?? "Erreur de chargement";
                    MessageBox.Show(StatusText.Text, "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                }

                ApplySearch();
            }
            catch (Exception ex)
            {
                StatusText.Text = $"Erreur: {ex.Message}";
                MessageBox.Show(StatusText.Text, "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void ApplicationsDataGrid_MouseDoubleClick(object sender, System.Windows.Input.MouseButtonEventArgs e)
        {
            if (ApplicationsDataGrid.SelectedItem is ApplicationItem selectedItem)
            {
                try
                {
                    var detailWindow = new ViewCreditRequestWindow(_apiService, selectedItem.Id);
                    detailWindow.Owner = this;
                    detailWindow.ShowDialog();
                    
                    // Refresh list after closing detail window in case of any changes
                    _ = LoadAsync(_currentPage, _pageSize);
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Erreur lors de l'ouverture des détails: {ex.Message}",
                        "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void ViewDetails_Click(object sender, RoutedEventArgs e)
        {
            if (sender is System.Windows.Controls.Button button && button.Tag is Guid applicationId)
            {
                try
                {
                    var detailWindow = new ViewCreditRequestWindow(_apiService, applicationId);
                    detailWindow.Owner = this;
                    detailWindow.ShowDialog();
                    
                    // Refresh list after closing detail window in case of any changes
                    _ = LoadAsync(_currentPage, _pageSize);
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Erreur lors de l'ouverture des détails: {ex.Message}",
                        "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private string? GetSelectedStatus()
        {
            try
            {
                if (StatusCombo.SelectedItem is System.Windows.Controls.ComboBoxItem item)
                {
                    var tag = item.Tag as string;
                    return string.IsNullOrWhiteSpace(tag) ? null : tag;
                }
            }
            catch { }
            return null;
        }

        private string? GetSelectedLoanType()
        {
            try
            {
                if (LoanTypeCombo.SelectedItem is System.Windows.Controls.ComboBoxItem item)
                {
                    var tag = item.Tag as string;
                    return string.IsNullOrWhiteSpace(tag) ? null : tag;
                }
            }
            catch { }
            return null;
        }

        private int GetSelectedPageSize()
        {
            try
            {
                if (PageSizeCombo.SelectedItem is System.Windows.Controls.ComboBoxItem item)
                {
                    if (int.TryParse(item.Content?.ToString(), out var size) && size > 0)
                        return size;
                }
            }
            catch { }
            return 50;
        }

        private static bool ContainsNotValidMessage(string? message)
        {
            if (string.IsNullOrWhiteSpace(message)) return false;
            return message.IndexOf("not valid", StringComparison.OrdinalIgnoreCase) >= 0
                   || message.IndexOf("invalide", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        private static string[] GetStatusAlternatives(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return new[] { (string?)null }!;
            var s = status.ToLowerInvariant();
            return s switch
            {
                "draft" => new[] { "Draft", "draft", "DRAFT" },
                "submitted" => new[] { "Submitted", "submitted", "SUBMITTED" },
                "underreview" => new[] { "UnderReview", "underreview", "UNDER_REVIEW" },
                "approved" => new[] { "Approved", "approved", "APPROVED" },
                "rejected" => new[] { "Rejected", "rejected", "REJECTED" },
                "cancelled" => new[] { "Cancelled", "cancelled", "CANCELLED" },
                _ => new[] { status }
            };
        }

        private static string[] GetLoanTypeAlternatives(string? loanType)
        {
            if (string.IsNullOrWhiteSpace(loanType)) return new[] { (string?)null }!;
            var t = loanType.ToLowerInvariant();
            return t switch
            {
                "commercial" => new[] { "commercial", "Commercial", "COMMERCIAL", "business" },
                "agricultural" => new[] { "agricultural", "Agricultural", "AGRICULTURAL", "agricole" },
                "personal" => new[] { "personal", "Personal", "PERSONAL" },
                "emergency" => new[] { "emergency", "Emergency", "EMERGENCY", "urgence" },
                "creditloyer" => new[] { "creditloyer", "CreditLoyer", "CREDIT_LOYER", "loyer", "rent" },
                "creditauto" => new[] { "creditauto", "CreditAuto", "CREDIT_AUTO", "auto", "car" },
                "creditmoto" => new[] { "creditmoto", "CreditMoto", "CREDIT_MOTO", "moto", "motorcycle" },
                "creditpersonnel" => new[] { "creditpersonnel", "CreditPersonnel", "CREDIT_PERSONNEL", "personnel" },
                "creditscolaire" => new[] { "creditscolaire", "CreditScolaire", "CREDIT_SCOLAIRE", "scolaire", "education" },
                "creditagricole" => new[] { "creditagricole", "CreditAgricole", "CREDIT_AGRICOLE", "agriculture" },
                "creditprofessionnel" => new[] { "creditprofessionnel", "CreditProfessionnel", "CREDIT_PROFESSIONNEL", "professionnel" },
                "creditappui" => new[] { "creditappui", "CreditAppui", "CREDIT_APPUI", "appui" },
                "credithypothecaire" => new[] { "credithypothecaire", "CreditHypothecaire", "CREDIT_HYPOTHECAIRE", "hypothecaire", "housing", "logement" },
                _ => new[] { loanType }
            };
        }

        private void ApplySearch()
        {
            var q = SearchTextBox.Text?.Trim();
            if (string.IsNullOrEmpty(q))
            {
                ApplicationsDataGrid.ItemsSource = _items;
            }
            else
            {
                var filtered = _items.Where(i =>
                    (i.ApplicationNumber?.IndexOf(q, StringComparison.OrdinalIgnoreCase) ?? -1) >= 0 ||
                    (i.CustomerName?.IndexOf(q, StringComparison.OrdinalIgnoreCase) ?? -1) >= 0);
                ApplicationsDataGrid.ItemsSource = new ObservableCollection<ApplicationItem>(filtered);
            }
        }

        private static string FormatStatus(string? status)
        {
            return status switch
            {
                "Pending" => "En attente",
                "Approved" => "Approuvée",
                "Rejected" => "Rejetée",
                "UnderReview" => "En revue",
                _ => status ?? "N/A"
            };
        }

        private static string FormatLoanType(MicrocreditLoanType type)
        {
            return type switch
            {
                MicrocreditLoanType.Commercial => "Crédit Commercial",
                MicrocreditLoanType.Agricultural => "Crédit Agricole (Standard)",
                MicrocreditLoanType.Personal => "Crédit Personnel (Standard)",
                MicrocreditLoanType.Emergency => "Crédit d'Urgence",
                MicrocreditLoanType.CreditLoyer => "Crédit Loyer",
                MicrocreditLoanType.CreditAuto => "Crédit Auto",
                MicrocreditLoanType.CreditMoto => "Crédit Moto",
                MicrocreditLoanType.CreditPersonnel => "Crédit Personnel",
                MicrocreditLoanType.CreditScolaire => "Crédit Scolaire",
                MicrocreditLoanType.CreditAgricole => "Crédit Agricole",
                MicrocreditLoanType.CreditProfessionnel => "Crédit Professionnel",
                MicrocreditLoanType.CreditAppui => "Crédit d'Appui",
                MicrocreditLoanType.CreditHypothecaire => "Crédit Hypothécaire",
                _ => "N/A"
            };
        }
    }

    public class ApplicationItem
    {
        public Guid Id { get; set; }
        public string? ApplicationNumber { get; set; }
        public string? CustomerName { get; set; }
        public decimal RequestedAmount { get; set; }
        public int RequestedDurationMonths { get; set; }
        public string? LoanTypeDisplay { get; set; }
        public string? StatusDisplay { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
