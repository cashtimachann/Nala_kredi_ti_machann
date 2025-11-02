using System.Windows;
using System.Windows.Controls;
using NalaCreditDesktop.Models;
using System.Collections.ObjectModel;

namespace NalaCreditDesktop.Views
{
    public partial class AccountsView : UserControl
    {
        private ObservableCollection<CompteClient> _comptes = new ObservableCollection<CompteClient>();

        public AccountsView()
        {
            InitializeComponent();
            SetupEventHandlers();
            LoadSampleData();
        }

        private void LoadSampleData()
        {
            // Charger des données de test
            _comptes.Clear();
            _comptes.Add(new CompteClient
            {
                NumeroCompte = "CC-001",
                NomClient = "Jean Baptiste",
                Telephone = "3811-2345",
                SoldeHTG = 15000.00m,
                SoldeUSD = 125.50m,
                Statut = "Actif",
                DateCreation = DateTime.Now.AddMonths(-6)
            });
            _comptes.Add(new CompteClient
            {
                NumeroCompte = "CC-002",
                NomClient = "Marie Carmel",
                Telephone = "3722-8901",
                SoldeHTG = 8500.00m,
                SoldeUSD = 75.00m,
                Statut = "Actif",
                DateCreation = DateTime.Now.AddMonths(-4)
            });
            _comptes.Add(new CompteClient
            {
                NumeroCompte = "CC-003",
                NomClient = "Pierre Louis",
                Telephone = "3944-5678",
                SoldeHTG = 22300.00m,
                SoldeUSD = 200.00m,
                Statut = "Actif",
                DateCreation = DateTime.Now.AddMonths(-8)
            });
            _comptes.Add(new CompteClient
            {
                NumeroCompte = "CC-004",
                NomClient = "Rose Michel",
                Telephone = "3655-3421",
                SoldeHTG = 5600.00m,
                SoldeUSD = 50.00m,
                Statut = "Inactif",
                DateCreation = DateTime.Now.AddYears(-1)
            });

            if (ComptesDataGrid != null)
                ComptesDataGrid.ItemsSource = _comptes;
        }

        private void SetupEventHandlers()
        {
            if (ActualiserListeButton != null)
                ActualiserListeButton.Click += (s, e) => ActualiserListe();

            if (SearchButton != null)
                SearchButton.Click += (s, e) => EffectuerRecherche();

            if (FermerConsultationButton != null)
                FermerConsultationButton.Click += (s, e) => FermerConsultation();

            if (ComptesDataGrid != null)
                ComptesDataGrid.LoadingRow += ComptesDataGrid_LoadingRow;
        }

        private void ComptesDataGrid_LoadingRow(object? sender, DataGridRowEventArgs e)
        {
            // Attacher les événements aux boutons de chaque ligne
            e.Row.Loaded += (s, args) =>
            {
                // Trouver les boutons dans la ligne
                var consulterBtn = FindVisualChild<Button>(e.Row, "ConsulterButton");
                var depotBtn = FindVisualChild<Button>(e.Row, "DepotButton");
                var retraitBtn = FindVisualChild<Button>(e.Row, "RetraitButton");

                if (consulterBtn != null)
                    consulterBtn.Click += (btnSender, btnArgs) => AfficherConsultation(e.Row.Item);

                if (depotBtn != null)
                    depotBtn.Click += (btnSender, btnArgs) => EffectuerDepot(e.Row.Item);

                if (retraitBtn != null)
                    retraitBtn.Click += (btnSender, btnArgs) => EffectuerRetrait(e.Row.Item);
            };
        }

        private void EffectuerRecherche()
        {
            // Logique de recherche
            string searchText = SearchTextBox?.Text ?? "";
            var statutItem = StatutComboBox?.SelectedItem as ComboBoxItem;
            string statut = statutItem?.Content?.ToString() ?? "Tous";

            // TODO: Implémenter la recherche avec le service
            MessageBox.Show($"Recherche: {searchText}, Statut: {statut}", "Recherche", 
                          MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void ActualiserListe()
        {
            // Actualiser la liste des comptes
            // TODO: Appeler le service pour recharger les données
            MessageBox.Show("Liste des comptes actualisée", "Actualisation", 
                          MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void AfficherConsultation(object compte)
        {
            if (compte == null || ConsultationOverlay == null)
                return;

            // Afficher l'overlay de consultation
            ConsultationOverlay.Visibility = Visibility.Visible;

            // Remplir les détails (utiliser la réflexion ou cast vers le bon type)
            try
            {
                var compteType = compte.GetType();
                var numeroCompte = compteType.GetProperty("NumeroCompte")?.GetValue(compte)?.ToString() ?? "--";
                var nomClient = compteType.GetProperty("NomClient")?.GetValue(compte)?.ToString() ?? "--";
                var telephone = compteType.GetProperty("Telephone")?.GetValue(compte)?.ToString() ?? "--";
                var statutProp = compteType.GetProperty("Statut")?.GetValue(compte)?.ToString() ?? "--";
                var soldeHTG = compteType.GetProperty("SoldeHTG")?.GetValue(compte);
                var soldeUSD = compteType.GetProperty("SoldeUSD")?.GetValue(compte);

                if (DetailNumeroCompte != null) DetailNumeroCompte.Text = numeroCompte;
                if (DetailNomClient != null) DetailNomClient.Text = nomClient;
                if (DetailTelephone != null) DetailTelephone.Text = telephone;
                if (DetailStatut != null) DetailStatut.Text = statutProp;
                if (DetailSoldeHTG != null && soldeHTG != null) 
                    DetailSoldeHTG.Text = $"{soldeHTG:N2} HTG";
                if (DetailSoldeUSD != null && soldeUSD != null) 
                    DetailSoldeUSD.Text = $"${soldeUSD:N2}";
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'affichage des détails: {ex.Message}", "Erreur", 
                              MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void FermerConsultation()
        {
            if (ConsultationOverlay != null)
                ConsultationOverlay.Visibility = Visibility.Collapsed;
        }

        private void EffectuerDepot(object compte)
        {
            if (compte == null)
                return;

            var compteType = compte.GetType();
            var numeroCompte = compteType.GetProperty("NumeroCompte")?.GetValue(compte)?.ToString() ?? "";

            MessageBox.Show($"Ouverture du formulaire de dépôt pour le compte: {numeroCompte}", 
                          "Dépôt", MessageBoxButton.OK, MessageBoxImage.Information);
            
            // TODO: Ouvrir le formulaire de dépôt ou naviguer vers TransactionView avec pré-remplissage
        }

        private void EffectuerRetrait(object compte)
        {
            if (compte == null)
                return;

            var compteType = compte.GetType();
            var numeroCompte = compteType.GetProperty("NumeroCompte")?.GetValue(compte)?.ToString() ?? "";

            MessageBox.Show($"Ouverture du formulaire de retrait pour le compte: {numeroCompte}", 
                          "Retrait", MessageBoxButton.OK, MessageBoxImage.Information);
            
            // TODO: Ouvrir le formulaire de retrait ou naviguer vers TransactionView avec pré-remplissage
        }

        // Méthode utilitaire pour trouver un contrôle enfant par nom
        private T? FindVisualChild<T>(DependencyObject parent, string childName) where T : DependencyObject
        {
            if (parent == null)
                return null;

            T? foundChild = null;
            int childrenCount = System.Windows.Media.VisualTreeHelper.GetChildrenCount(parent);

            for (int i = 0; i < childrenCount; i++)
            {
                var child = System.Windows.Media.VisualTreeHelper.GetChild(parent, i);

                if (child is not T childType)
                {
                    foundChild = FindVisualChild<T>(child, childName);

                    if (foundChild != null)
                        break;
                }
                else if (!string.IsNullOrEmpty(childName))
                {
                    if (child is FrameworkElement frameworkElement && frameworkElement.Name == childName)
                    {
                        foundChild = (T)child;
                        break;
                    }
                    else
                    {
                        foundChild = FindVisualChild<T>(child, childName);
                        if (foundChild != null)
                            break;
                    }
                }
                else
                {
                    foundChild = (T)child;
                    break;
                }
            }

            return foundChild;
        }
    }
}
