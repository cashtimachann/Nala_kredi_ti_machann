using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Services;
using NalaCreditDesktop.Views;

namespace NalaCreditDesktop.Views
{
    public partial class ConsultationCompteWindow : Window
    {
        private readonly ApiService _apiService;
        private ConsultationModel _consultation;
        private ObservableCollection<ClientModel> _baseDonneesClients;
        private ClientModel? _clientSelectionne;

        public ConsultationCompteWindow(ApiService apiService)
        {
            InitializeComponent();
            _apiService = apiService ?? throw new ArgumentNullException(nameof(apiService));
            InitialiserConsultation();
        }

        public void PrefillSearch(string terme)
        {
            if (string.IsNullOrWhiteSpace(terme))
            {
                return;
            }

            // If the window isn't fully loaded yet, defer the search until it is.
            // This avoids NullReferenceExceptions when controls are not yet
            // available for manipulation.
            var value = terme.Trim();

            if (this.IsLoaded)
            {
                try
                {
                    // Ensure UI thread operations are performed via the Dispatcher
                    this.Dispatcher?.BeginInvoke(new Action(() =>
                    {
                        if (RechercheTextBox != null)
                        {
                            RechercheTextBox.Text = value;
                            RechercheTextBox.UpdateLayout();
                            _ = EffectuerRechercheAsync(value);
                        }
                        else
                        {
                            Console.Error.WriteLine("PrefillSearch: RechercheTextBox is null after load.");
                        }
                    }));
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"PrefillSearch UI action failed: {ex}");
                }

                return;
            }

            // Attach a one-time Loaded handler to run the search after UI is ready
            RoutedEventHandler? handler = null;
            handler = (s, e) =>
            {
                try
                {
                    if (RechercheTextBox != null)
                    {
                        RechercheTextBox.Text = value;
                        RechercheTextBox.UpdateLayout();
                        _ = EffectuerRechercheAsync(value);
                    }
                }
                finally
                {
                    this.Loaded -= handler;
                }
            };

            this.Loaded += handler;
        }

        private void InitialiserConsultation()
        {
            _consultation = new ConsultationModel();
            
            // Simuler une base de données de clients
            InitialiserBaseDonneesClients();
            
            // Focus sur le champ de recherche if available; otherwise defer until Loaded
            try
            {
                if (RechercheTextBox != null)
                {
                    RechercheTextBox.Focus();
                }
                else
                {
                    RoutedEventHandler? focusHandler = null;
                    focusHandler = (s, e) =>
                    {
                        try { RechercheTextBox?.Focus(); }
                        finally { this.Loaded -= focusHandler; }
                    };

                    this.Loaded += focusHandler;
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"InitialiserConsultation focus error: {ex}");
            }
        }

        private void InitialiserBaseDonneesClients()
        {
            _baseDonneesClients = new ObservableCollection<ClientModel>
            {
                new ClientModel
                {
                    NumeroCompte = "ACC001234",
                    Nom = "PIERRE",
                    Prenom = "Jean",
                    Telephone = "+509 3456-7890",
                    Email = "jean.pierre@email.com",
                    SoldeHTG = 75000.00m,
                    SoldeUSD = 580.50m,
                    DerniereActivite = DateTime.Now.AddHours(-2),
                    Historique = new ObservableCollection<TransactionHistorique>
                    {
                        new TransactionHistorique { Date = DateTime.Now.AddHours(-1), Type = TransactionType.Depot, Devise = DeviseType.HTG, Montant = 25000, SoldeApres = 75000, Description = "Dépôt espèces", Caissier = "Marie Dupont" },
                        new TransactionHistorique { Date = DateTime.Now.AddHours(-3), Type = TransactionType.Retrait, Devise = DeviseType.USD, Montant = 200, SoldeApres = 580.50m, Description = "Retrait GAB", Caissier = "Paul Martin" },
                        new TransactionHistorique { Date = DateTime.Now.AddDays(-1), Type = TransactionType.Depot, Devise = DeviseType.USD, Montant = 500, SoldeApres = 780.50m, Description = "Virement reçu", Caissier = "Marie Dupont" }
                    }
                },
                new ClientModel
                {
                    NumeroCompte = "ACC002468",
                    Nom = "JOSEPH",
                    Prenom = "Marie",
                    Telephone = "+509 2987-6543",
                    Email = "marie.joseph@email.com",
                    SoldeHTG = 125000.00m,
                    SoldeUSD = 950.75m,
                    DerniereActivite = DateTime.Now.AddDays(-1),
                    Historique = new ObservableCollection<TransactionHistorique>
                    {
                        new TransactionHistorique { Date = DateTime.Now.AddDays(-1), Type = TransactionType.Change, Devise = DeviseType.USD, Montant = 150, SoldeApres = 950.75m, Description = "Change HTG->USD", Caissier = "Marie Dupont" },
                        new TransactionHistorique { Date = DateTime.Now.AddDays(-2), Type = TransactionType.Depot, Devise = DeviseType.HTG, Montant = 50000, SoldeApres = 125000, Description = "Dépôt chèque", Caissier = "Paul Martin" }
                    }
                },
                new ClientModel
                {
                    NumeroCompte = "ACC003691",
                    Nom = "LOUIS",
                    Prenom = "Pierre",
                    Telephone = "+509 4567-8901",
                    Email = "pierre.louis@email.com",
                    SoldeHTG = 89500.00m,
                    SoldeUSD = 675.25m,
                    DerniereActivite = DateTime.Now.AddMinutes(-30),
                    Historique = new ObservableCollection<TransactionHistorique>
                    {
                        new TransactionHistorique { Date = DateTime.Now.AddMinutes(-30), Type = TransactionType.Retrait, Devise = DeviseType.HTG, Montant = 10000, SoldeApres = 89500, Description = "Retrait espèces", Caissier = "Marie Dupont" },
                        new TransactionHistorique { Date = DateTime.Now.AddHours(-4), Type = TransactionType.Depot, Devise = DeviseType.USD, Montant = 300, SoldeApres = 675.25m, Description = "Dépôt devises", Caissier = "Marie Dupont" }
                    }
                }
            };
        }

        private void TypeRecherche_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (TypeRechercheComboBox == null || _consultation == null) return;
            
            if (TypeRechercheComboBox.SelectedItem is ComboBoxItem item)
            {
                string tag = item.Tag?.ToString() ?? "NumeroCompte";
                _consultation.TypeRecherche = tag switch
                {
                    "Nom" => TypeRecherche.Nom,
                    "Telephone" => TypeRecherche.Telephone,
                    _ => TypeRecherche.NumeroCompte
                };

                // Mettre à jour le label
                if (SearchLabel != null)
                {
                    SearchLabel.Text = tag switch
                    {
                        "Nom" => "Nom du client :",
                        "Telephone" => "Numéro de téléphone :",
                        _ => "Numéro de compte :"
                    };
                }

                // Vider le champ de recherche
                if (RechercheTextBox != null) RechercheTextBox.Text = "";
                if (SearchResultsPanel != null) SearchResultsPanel.Visibility = Visibility.Collapsed;
            }
        }

        private void Recherche_TextChanged(object sender, TextChangedEventArgs e)
        {
            if (RechercheTextBox == null) return;
            
            string terme = RechercheTextBox.Text.Trim();
            
            if (string.IsNullOrEmpty(terme))
            {
                if (SearchResultsPanel != null)
                    SearchResultsPanel.Visibility = Visibility.Collapsed;
                return;
            }

            // Recherche en temps réel si plus de 2 caractères
            if (terme.Length >= 3)
            {
                EffectuerRecherche(terme);
            }
        }

        private void Recherche_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Enter)
            {
                Rechercher_Click(sender, new RoutedEventArgs());
            }
        }

        private void Rechercher_Click(object sender, RoutedEventArgs e)
        {
            if (RechercheTextBox == null)
            {
                Console.Error.WriteLine("[ERROR] RechercheTextBox is null in Rechercher_Click");
                return;
            }
            
            string terme = RechercheTextBox.Text.Trim();
            
            if (string.IsNullOrEmpty(terme))
            {
                MessageBox.Show("Veuillez saisir un terme de recherche.", "Recherche", 
                    MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            EffectuerRecherche(terme);
        }

        private async void EffectuerRecherche(string terme)
        {
            await EffectuerRechercheAsync(terme);
        }

        private async Task EffectuerRechercheAsync(string terme)
        {
            try
            {
                // Verify controls exist before proceeding
                if (SearchResultsListBox == null || SearchResultsPanel == null || ClientInfoContainer == null || EmptyStatePanel == null)
                {
                    Console.Error.WriteLine("[ERROR] Required UI controls are null in EffectuerRechercheAsync");
                    MessageBox.Show("Erreur d'initialisation de l'interface. Veuillez fermer et réouvrir cette fenêtre.", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                    return;
                }

                Console.WriteLine($"[INFO] Starting search for: {terme}, Type: {_consultation.TypeRecherche}");

                // If searching by account number, prefer backend lookup to get real account & transactions
                if (_consultation.TypeRecherche == TypeRecherche.NumeroCompte)
                {
                    var apiResult = await _apiService.GetClientAccountByNumberAsync(terme);

                    if (apiResult.IsSuccess && apiResult.Data != null)
                    {
                        Console.WriteLine($"[INFO] Found account: {apiResult.Data.AccountNumber}");
                        
                        // Map API response to ClientModel and fetch transactions
                        var client = MapClientAccountToClientModel(apiResult.Data);

                        // Fetch transactions
                        var txResult = await _apiService.GetClientAccountTransactionsAsync(apiResult.Data.AccountNumber);
                        if (txResult.IsSuccess && txResult.Data != null)
                        {
                            var txs = txResult.Data.Transactions ?? new List<ClientAccountTransactionItem>();
                            client.Historique = new ObservableCollection<TransactionHistorique>(
                                txs.Select(MapTransactionItemToHistorique));
                        }

                        AfficherClient(client);
                        return;
                    }
                    else
                    {
                        Console.WriteLine($"[INFO] Account not found via API: {apiResult.ErrorMessage}");
                    }
                }
            }
            catch (Exception ex)
            {
                // Log the full exception for diagnostics
                Console.Error.WriteLine($"[ERROR] EffectuerRechercheAsync exception:");
                Console.Error.WriteLine($"Message: {ex.Message}");
                Console.Error.WriteLine($"Type: {ex.GetType().Name}");
                Console.Error.WriteLine($"StackTrace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.Error.WriteLine($"Inner: {ex.InnerException.Message}");
                }
                
                MessageBox.Show($"Erreur lors de la recherche du compte:\n\n{ex.Message}\n\nLe problème a été enregistré.", "Erreur", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            // Otherwise, try a backend search by name/telephone or fall back to local sample DB
            if (_consultation.TypeRecherche == TypeRecherche.Nom || _consultation.TypeRecherche == TypeRecherche.Telephone)
            {
                try
                {
                    var searchResult = await _apiService.SearchClientAccountsAsync(terme);

                    if (searchResult.IsSuccess && searchResult.Data != null && searchResult.Data.Results.Any())
                    {
                        var results = searchResult.Data.Results.Select(MapClientAccountToClientModel).ToList();
                        if (SearchResultsListBox != null)
                        {
                            SearchResultsListBox.ItemsSource = results;
                            if (SearchResultsPanel != null)
                                SearchResultsPanel.Visibility = Visibility.Visible;
                        }
                        if (results.Count == 1)
                        {
                            AfficherClient(results.First());
                        }
                        return;
                    }
                    // If API call failed, show a friendly message and fall back to local search
                    if (!searchResult.IsSuccess)
                    {
                        Console.Error.WriteLine($"API search returned error: {searchResult.ErrorMessage}");
                        MessageBox.Show($"Erreur de recherche distante: {searchResult.ErrorMessage}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Warning);
                    }
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"Erreur recherche API comptes: {ex}");
                    MessageBox.Show($"Erreur recherche API comptes:\n{ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Warning);
                }
            }

            // Fallback: local sample DB (useful for development/offline)
            var resultats = _consultation.TypeRecherche switch
            {
                TypeRecherche.NumeroCompte => _baseDonneesClients.Where(c =>
                    c.NumeroCompte.Contains(terme, StringComparison.OrdinalIgnoreCase)).ToList(),
                TypeRecherche.Nom => _baseDonneesClients.Where(c =>
                    c.Nom.Contains(terme, StringComparison.OrdinalIgnoreCase) ||
                    c.Prenom.Contains(terme, StringComparison.OrdinalIgnoreCase) ||
                    c.NomComplet.Contains(terme, StringComparison.OrdinalIgnoreCase)).ToList(),
                TypeRecherche.Telephone => _baseDonneesClients.Where(c =>
                    c.Telephone.Contains(terme)).ToList(),
                _ => new List<ClientModel>()
            };

            if (resultats.Any())
            {
                if (SearchResultsListBox != null)
                    SearchResultsListBox.ItemsSource = resultats;
                if (SearchResultsPanel != null)
                    SearchResultsPanel.Visibility = Visibility.Visible;

                // Si un seul résultat, l'afficher automatiquement
                if (resultats.Count == 1)
                {
                    AfficherClient(resultats.First());
                }
            }
            else
            {
                if (SearchResultsPanel != null)
                    SearchResultsPanel.Visibility = Visibility.Collapsed;
                MessageBox.Show($"Aucun client trouvé pour '{terme}'.", "Recherche",
                    MessageBoxButton.OK, MessageBoxImage.Information);
            }
        }

        private ClientModel MapClientAccountToClientModel(ClientAccountResponse dto)
        {
            var parts = (dto.CustomerName ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var prenom = parts.Length > 0 ? parts[0] : string.Empty;
            var nom = parts.Length > 1 ? string.Join(' ', parts.Skip(1)) : string.Empty;

            return new ClientModel
            {
                NumeroCompte = dto.AccountNumber,
                Prenom = prenom,
                Nom = nom,
                Telephone = dto.CustomerPhone ?? string.Empty,
                Email = string.Empty,
                SoldeHTG = string.Equals(dto.Currency, "HTG", StringComparison.OrdinalIgnoreCase) ? dto.Balance : 0m,
                SoldeUSD = string.Equals(dto.Currency, "USD", StringComparison.OrdinalIgnoreCase) ? dto.Balance : 0m,
                DerniereActivite = dto.LastTransactionDate ?? DateTime.Now,
                Historique = new ObservableCollection<TransactionHistorique>()
            };
        }

        private TransactionHistorique MapTransactionItemToHistorique(ClientAccountTransactionItem item)
        {
            return new TransactionHistorique
            {
                Date = item.ProcessedAt == default ? item.CreatedAt : item.ProcessedAt,
                Type = item.Type == null ? TransactionType.Other : (item.Type.Equals("deposit", StringComparison.OrdinalIgnoreCase) ? TransactionType.Depot : (item.Type.Equals("withdrawal", StringComparison.OrdinalIgnoreCase) ? TransactionType.Retrait : TransactionType.Other)),
                Devise = string.Equals(item.Currency, "USD", StringComparison.OrdinalIgnoreCase) ? DeviseType.USD : DeviseType.HTG,
                Montant = item.Amount,
                SoldeApres = item.BalanceAfter,
                Description = item.Description ?? item.Reference ?? string.Empty,
                Caissier = item.ProcessedBy ?? string.Empty
            };
        }

        private void SearchResults_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (SearchResultsListBox == null) return;
            
            if (SearchResultsListBox.SelectedItem is ClientModel client)
            {
                AfficherClient(client);
                if (SearchResultsPanel != null)
                    SearchResultsPanel.Visibility = Visibility.Collapsed;
            }
        }

        private void AfficherClient(ClientModel client)
        {
            try
            {
                if (client == null)
                {
                    Console.Error.WriteLine("[ERROR] AfficherClient called with null client");
                    return;
                }

                Console.WriteLine($"[INFO] Displaying client: {client.NumeroCompte}");

                _clientSelectionne = client;
                _consultation.ClientTrouve = client;

                // Verify required UI elements exist
                if (EmptyStatePanel == null || ClientInfoContainer == null)
                {
                    Console.Error.WriteLine("[ERROR] EmptyStatePanel or ClientInfoContainer is null");
                    MessageBox.Show("Erreur d'affichage: Certains éléments de l'interface sont manquants.", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                    return;
                }

                // Masquer l'état vide et afficher les informations
                EmptyStatePanel.Visibility = Visibility.Collapsed;
                ClientInfoContainer.Visibility = Visibility.Visible;

                // Remplir les informations de base avec vérifications de null
                if (ClientNomText != null) ClientNomText.Text = client.NomComplet ?? "N/A";
                if (ClientCompteText != null) ClientCompteText.Text = $"Compte: {client.NumeroCompte ?? "N/A"}";
                if (ClientTelephoneText != null) ClientTelephoneText.Text = $"📱 {client.Telephone ?? "N/A"}";
                if (ClientEmailText != null) ClientEmailText.Text = $"✉️ {client.Email ?? "N/A"}";

                // Afficher les soldes
                if (SoldeHTGText != null) SoldeHTGText.Text = $"{client.SoldeHTG:N2}";
                if (SoldeUSDText != null) SoldeUSDText.Text = $"{client.SoldeUSD:N2}";
                
                if (DerniereActiviteHTGText != null) DerniereActiviteHTGText.Text = $"Dernière activité: {client.DerniereActivite:dd/MM/yyyy HH:mm}";
                if (DerniereActiviteUSDText != null) DerniereActiviteUSDText.Text = $"Dernière activité: {client.DerniereActivite:dd/MM/yyyy HH:mm}";

                // Remplir l'historique des transactions
                if (TransactionsDataGrid != null && client.Historique != null)
                {
                    var dernieresTransactions = client.Historique
                        .OrderByDescending(t => t.Date)
                        .Take(5)
                        .ToList();
                    
                    TransactionsDataGrid.ItemsSource = dernieresTransactions;
                }

                // Simuler l'historique des changes (filtrer les transactions de type Change)
                if (HistoriqueChangeDataGrid != null)
                {
                    var historiqueChange = new ObservableCollection<ChangeModel>
                    {
                        new ChangeModel 
                        { 
                            DateOperation = DateTime.Now.AddDays(-1),
                            DeviseSource = DeviseType.HTG,
                            DeviseDestination = DeviseType.USD,
                            MontantSource = 19500,
                            MontantDestination = 150,
                            TauxApplique = 130,
                            Caissier = "Marie Dupont"
                        }
                    };
                    
                    HistoriqueChangeDataGrid.ItemsSource = historiqueChange;
                }

                // Activer les boutons d'action
                if (NouveauDepotButton != null) NouveauDepotButton.IsEnabled = true;
                if (NouveauRetraitButton != null) NouveauRetraitButton.IsEnabled = true;
                if (ImprimerReleveButton != null) ImprimerReleveButton.IsEnabled = true;

                Console.WriteLine("[INFO] Client displayed successfully");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[ERROR] AfficherClient exception: {ex.Message}");
                Console.Error.WriteLine($"StackTrace: {ex.StackTrace}");
                MessageBox.Show($"Erreur lors de l'affichage du client:\n\n{ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void NombreTransactions_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            try
            {
                if (_clientSelectionne == null || NombreTransactionsComboBox == null)
                    return;

                if (NombreTransactionsComboBox.SelectedItem is not ComboBoxItem item)
                    return;

                var valeur = item.Content?.ToString() ?? "Toutes";

                if (valeur.Equals("Toutes", StringComparison.OrdinalIgnoreCase))
                {
                    TransactionsDataGrid.ItemsSource = _clientSelectionne.Historique.OrderByDescending(t => t.Date).ToList();
                    return;
                }

                if (int.TryParse(valeur, out var count) && count > 0)
                {
                    TransactionsDataGrid.ItemsSource = _clientSelectionne.Historique.OrderByDescending(t => t.Date).Take(count).ToList();
                }
            }
            catch (Exception ex)
            {
                // Defensive: show friendly message rather than crash
                MessageBox.Show($"Erreur lors du filtrage des transactions:\n{ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }

        private void NouveauDepot_Click(object sender, RoutedEventArgs e)
        {
            if (_clientSelectionne != null)
            {
                try
                {
                    var depotWindow = new NouveauDepotWindow(_apiService);
                    // Pré-remplir avec le numéro de compte du client
                    // depotWindow.PreRemplirClient(_clientSelectionne.NumeroCompte);
                    depotWindow.ShowDialog();

                    // Actualiser les informations après fermeture
                    ActualiserInformationsClient();
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Erreur lors de l'ouverture du module de dépôt:\n\n{ex}",
                        "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void NouveauRetrait_Click(object sender, RoutedEventArgs e)
        {
            if (_clientSelectionne != null)
            {
                try
                {
                    var retraitWindow = new NouveauRetraitWindow(_apiService);
                    // Pré-remplir avec le numéro de compte du client
                    // retraitWindow.PreRemplirClient(_clientSelectionne.NumeroCompte);
                    retraitWindow.ShowDialog();

                    // Actualiser les informations après fermeture
                    ActualiserInformationsClient();
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Erreur lors de l'ouverture du module de retrait:\n\n{ex}",
                        "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void ImprimerReleve_Click(object sender, RoutedEventArgs e)
        {
            if (_clientSelectionne != null)
            {
                try
                {
                    string releve = GenererReleve();
                    
                    MessageBox.Show("Relevé envoyé à l'imprimante!\n\nContenu du relevé:\n\n" + releve, 
                        "Impression Relevé", MessageBoxButton.OK, MessageBoxImage.Information);

                    _consultation.ImprimerReleve = true;

                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Erreur lors de l'impression: {ex.Message}", "Erreur", 
                        MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private string GenererReleve()
        {
            if (_clientSelectionne == null) return "";

            var transactions = _clientSelectionne.Historique
                .OrderByDescending(t => t.Date)
                .Take(10);

            string releve = $@"
═══════════════════════════════════════
            NALA KREDI
         RELEVÉ DE COMPTE
═══════════════════════════════════════

Client: {_clientSelectionne.NomComplet}
Compte: {_clientSelectionne.NumeroCompte}
Téléphone: {_clientSelectionne.Telephone}
Email: {_clientSelectionne.Email}

───────────────────────────────────────
SOLDES ACTUELS
───────────────────────────────────────
HTG: {_clientSelectionne.SoldeHTG:N2}
USD: {_clientSelectionne.SoldeUSD:N2}

Dernière activité: {_clientSelectionne.DerniereActivite:dd/MM/yyyy HH:mm}

───────────────────────────────────────
DERNIÈRES TRANSACTIONS
───────────────────────────────────────";

            foreach (var transaction in transactions)
            {
                releve += $@"
{transaction.Date:dd/MM/yyyy HH:mm} | {transaction.Type} 
{transaction.Montant:N2} {transaction.Devise} | Solde: {transaction.SoldeApres:N2}
{transaction.Description} | {transaction.Caissier}
───────────────────────────────────────";
            }

            releve += $@"

Édité le: {DateTime.Now:dd/MM/yyyy HH:mm}
Par: Marie Dupont - Caisse CS-001
═══════════════════════════════════════";

            return releve;
        }

        private void ActualiserInformationsClient()
        {
            if (_clientSelectionne != null)
            {
                // Dans un vrai système, on rechargerait les données depuis la base
                // Pour la démo, on simule une actualisation
                AfficherClient(_clientSelectionne);
            }
        }

        private void Fermer_Click(object sender, RoutedEventArgs e)
        {
            this.Close();
        }
    }

    // Extensions pour les modèles
    public static class ChangeModelExtensions
    {
        public static string MontantSourceFormate(this ChangeModel change)
        {
            return $"{change.MontantSource:N2} {change.DeviseSource}";
        }

        public static string MontantDestinationFormate(this ChangeModel change)
        {
            return $"{change.MontantDestination:N2} {change.DeviseDestination}";
        }
    }
}