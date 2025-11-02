using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using NalaCreditDesktop.Models;
using NalaCreditDesktop.Views;

namespace NalaCreditDesktop.Views
{
    public partial class ConsultationCompteWindow : Window
    {
        private ConsultationModel _consultation;
        private ObservableCollection<ClientModel> _baseDonneesClients;
        private ClientModel? _clientSelectionne;

        public ConsultationCompteWindow()
        {
            InitializeComponent();
            InitialiserConsultation();
        }

        private void InitialiserConsultation()
        {
            _consultation = new ConsultationModel();
            
            // Simuler une base de données de clients
            InitialiserBaseDonneesClients();
            
            // Focus sur le champ de recherche
            RechercheTextBox.Focus();
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
                SearchLabel.Text = tag switch
                {
                    "Nom" => "Nom du client :",
                    "Telephone" => "Numéro de téléphone :",
                    _ => "Numéro de compte :"
                };

                // Vider le champ de recherche
                RechercheTextBox.Text = "";
                SearchResultsPanel.Visibility = Visibility.Collapsed;
            }
        }

        private void Recherche_TextChanged(object sender, TextChangedEventArgs e)
        {
            string terme = RechercheTextBox.Text.Trim();
            
            if (string.IsNullOrEmpty(terme))
            {
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
            string terme = RechercheTextBox.Text.Trim();
            
            if (string.IsNullOrEmpty(terme))
            {
                MessageBox.Show("Veuillez saisir un terme de recherche.", "Recherche", 
                    MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            EffectuerRecherche(terme);
        }

        private void EffectuerRecherche(string terme)
        {
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
                SearchResultsListBox.ItemsSource = resultats;
                SearchResultsPanel.Visibility = Visibility.Visible;
                
                // Si un seul résultat, l'afficher automatiquement
                if (resultats.Count == 1)
                {
                    AfficherClient(resultats.First());
                }
            }
            else
            {
                SearchResultsPanel.Visibility = Visibility.Collapsed;
                MessageBox.Show($"Aucun client trouvé pour '{terme}'.", "Recherche", 
                    MessageBoxButton.OK, MessageBoxImage.Information);
            }
        }

        private void SearchResults_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (SearchResultsListBox.SelectedItem is ClientModel client)
            {
                AfficherClient(client);
                SearchResultsPanel.Visibility = Visibility.Collapsed;
            }
        }

        private void AfficherClient(ClientModel client)
        {
            _clientSelectionne = client;
            _consultation.ClientTrouve = client;

            // Masquer l'état vide et afficher les informations
            EmptyStatePanel.Visibility = Visibility.Collapsed;
            ClientInfoContainer.Visibility = Visibility.Visible;

            // Remplir les informations de base
            ClientNomText.Text = client.NomComplet;
            ClientCompteText.Text = $"Compte: {client.NumeroCompte}";
            ClientTelephoneText.Text = $"📱 {client.Telephone}";
            ClientEmailText.Text = $"✉️ {client.Email}";

            // Afficher les soldes
            SoldeHTGText.Text = $"{client.SoldeHTG:N2}";
            SoldeUSDText.Text = $"{client.SoldeUSD:N2}";
            
            DerniereActiviteHTGText.Text = $"Dernière activité: {client.DerniereActivite:dd/MM/yyyy HH:mm}";
            DerniereActiviteUSDText.Text = $"Dernière activité: {client.DerniereActivite:dd/MM/yyyy HH:mm}";

            // Remplir l'historique des transactions
            var dernieresTransactions = client.Historique
                .OrderByDescending(t => t.Date)
                .Take(5)
                .ToList();
            
            TransactionsDataGrid.ItemsSource = dernieresTransactions;

            // Simuler l'historique des changes (filtrer les transactions de type Change)
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

            // Activer les boutons d'action
            NouveauDepotButton.IsEnabled = true;
            NouveauRetraitButton.IsEnabled = true;
            ImprimerReleveButton.IsEnabled = true;
        }

        private void NombreTransactions_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (_clientSelectionne != null && NombreTransactionsComboBox.SelectedItem is ComboBoxItem item)
            {
                string valeur = item.Content.ToString();
                
                var transactions = valeur == "Toutes" 
                    ? _clientSelectionne.Historique.OrderByDescending(t => t.Date).ToList()
                    : _clientSelectionne.Historique.OrderByDescending(t => t.Date).Take(int.Parse(valeur)).ToList();
                
                TransactionsDataGrid.ItemsSource = transactions;
            }
        }

        private void NouveauDepot_Click(object sender, RoutedEventArgs e)
        {
            if (_clientSelectionne != null)
            {
                var depotWindow = new NouveauDepotWindow();
                // Pré-remplir avec le numéro de compte du client
                // depotWindow.PreRemplirClient(_clientSelectionne.NumeroCompte);
                depotWindow.ShowDialog();
                
                // Actualiser les informations après fermeture
                ActualiserInformationsClient();
            }
        }

        private void NouveauRetrait_Click(object sender, RoutedEventArgs e)
        {
            if (_clientSelectionne != null)
            {
                var retraitWindow = new NouveauRetraitWindow();
                // Pré-remplir avec le numéro de compte du client
                // retraitWindow.PreRemplirClient(_clientSelectionne.NumeroCompte);
                retraitWindow.ShowDialog();
                
                // Actualiser les informations après fermeture
                ActualiserInformationsClient();
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