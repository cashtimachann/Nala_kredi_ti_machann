using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Threading;

namespace NalaCreditDesktop.Views
{
    public partial class CreditAgentDashboard : Window
    {
        private DispatcherTimer _timer;

        public CreditAgentDashboard()
        {
            InitializeComponent();
            InitializeTimer();
            LoadDashboardData();
        }

        private void InitializeTimer()
        {
            _timer = new DispatcherTimer();
            _timer.Interval = TimeSpan.FromSeconds(1);
            _timer.Tick += Timer_Tick;
            _timer.Start();
        }

        private void Timer_Tick(object? sender, EventArgs e)
        {
            CurrentTimeText.Text = DateTime.Now.ToString("HH:mm:ss");
            CurrentDateText.Text = DateTime.Now.ToString("dddd, dd MMMM yyyy");
        }

        private void LoadDashboardData()
        {
            // Set user name (this would come from authentication)
            UserNameText.Text = "Jean Baptiste - Agent #12345";

            // Load statistics (sample data)
            ActiveCreditsText.Text = "23";
            PortfolioAmountText.Text = "345,500 HTG";
            PendingApplicationsText.Text = "7";
            RepaymentRateText.Text = "94.5%";
            NotificationBadge.Text = "5";

            // Load recent applications
            var recentApplications = new ObservableCollection<LoanApplication>
            {
                new LoanApplication { ClientName = "Marie Joseph", Amount = "15,000 HTG", Status = "En Attente" },
                new LoanApplication { ClientName = "Pierre Duval", Amount = "25,000 HTG", Status = "Approuvé" },
                new LoanApplication { ClientName = "Rose Michel", Amount = "10,000 HTG", Status = "En Révision" },
                new LoanApplication { ClientName = "Jean Claude", Amount = "20,000 HTG", Status = "En Attente" },
                new LoanApplication { ClientName = "Micheline Paul", Amount = "18,000 HTG", Status = "Approuvé" }
            };
            RecentApplicationsGrid.ItemsSource = recentApplications;

            // Load payments due this week
            var paymentsDue = new ObservableCollection<PaymentDue>
            {
                new PaymentDue { ClientName = "Marie Joseph", DueDate = "Lundi 14 Oct", Amount = "1,500 HTG" },
                new PaymentDue { ClientName = "Pierre Duval", DueDate = "Mardi 15 Oct", Amount = "2,500 HTG" },
                new PaymentDue { ClientName = "Rose Michel", DueDate = "Mercredi 16 Oct", Amount = "1,000 HTG" },
                new PaymentDue { ClientName = "Jean Claude", DueDate = "Jeudi 17 Oct", Amount = "2,000 HTG" },
                new PaymentDue { ClientName = "Micheline Paul", DueDate = "Vendredi 18 Oct", Amount = "1,800 HTG" }
            };
            PaymentsDueList.ItemsSource = paymentsDue;

            // Load today's visits
            var todayVisits = new ObservableCollection<ScheduledVisit>
            {
                new ScheduledVisit 
                { 
                    Time = "09:00", 
                    ClientName = "Marie Joseph", 
                    Purpose = "Évaluation terrain", 
                    Address = "Rue 12, Delmas 32" 
                },
                new ScheduledVisit 
                { 
                    Time = "11:30", 
                    ClientName = "Pierre Duval", 
                    Purpose = "Suivi remboursement", 
                    Address = "Avenue Martin Luther King, PaP" 
                },
                new ScheduledVisit 
                { 
                    Time = "14:00", 
                    ClientName = "Rose Michel", 
                    Purpose = "Nouvelle demande", 
                    Address = "Rue Lamarre, Pétion-Ville" 
                }
            };
            TodayVisitsList.ItemsSource = todayVisits;
        }

        // Menu Navigation Events
        private void Dashboard_Click(object sender, RoutedEventArgs e)
        {
            LoadDashboardData();
        }

        private void Transactions_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Module Transactions - Accès aux fonctions de caissier\n\n" +
                          "Fonctionnalités disponibles:\n" +
                          "• Dépôts\n" +
                          "• Retraits\n" +
                          "• Transferts\n" +
                          "• Change de devises",
                          "Transactions",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void NewLoanApplication_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("📝 Nouvelle Demande de Crédit\n\n" +
                          "Formulaire de saisie:\n" +
                          "• Informations client\n" +
                          "• Montant demandé\n" +
                          "• Durée du prêt\n" +
                          "• Type de crédit (Commerce, Agriculture, etc.)\n" +
                          "• Garanties\n" +
                          "• Documents requis\n" +
                          "• Évaluation initiale",
                          "Nouvelle Demande",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void MyApplications_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("📋 Mes Demandes de Crédit\n\n" +
                          "Liste de toutes vos demandes:\n" +
                          "• En attente d'évaluation\n" +
                          "• En révision\n" +
                          "• Approuvées\n" +
                          "• Rejetées\n" +
                          "• Décaissées\n\n" +
                          "Filtres: Statut, Date, Montant, Client",
                          "Mes Demandes",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void RecordPayment_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("💵 Enregistrement Remboursement\n\n" +
                          "Formulaire:\n" +
                          "• Numéro de crédit\n" +
                          "• Client\n" +
                          "• Montant payé\n" +
                          "• Date de paiement\n" +
                          "• Mode de paiement (Cash, Mobile Money)\n" +
                          "• Remarques\n\n" +
                          "Le système calculera automatiquement:\n" +
                          "• Capital remboursé\n" +
                          "• Intérêts payés\n" +
                          "• Solde restant\n" +
                          "• Prochaine échéance",
                          "Enregistrer Paiement",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void MyPortfolio_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("👥 Mon Portefeuille Clients\n\n" +
                          "Vue d'ensemble:\n" +
                          "• Liste complète de vos clients\n" +
                          "• Crédits actifs par client\n" +
                          "• Historique de remboursement\n" +
                          "• Clients en retard\n" +
                          "• Performance globale\n\n" +
                          "Indicateurs:\n" +
                          "• Nombre de clients actifs\n" +
                          "• Encours total\n" +
                          "• Taux de remboursement\n" +
                          "• PAR (Portfolio At Risk)\n" +
                          "• Nombre de crédits",
                          "Mon Portefeuille",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void ScheduledVisits_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("🗺️ Visites Terrain Planifiées\n\n" +
                          "Gestion des visites:\n" +
                          "• Calendrier de visites\n" +
                          "• Planifier nouvelle visite\n" +
                          "• Itinéraire optimisé\n" +
                          "• Clients à visiter\n" +
                          "• Historique des visites\n\n" +
                          "Pour chaque visite:\n" +
                          "• Client et adresse\n" +
                          "• Objectif de la visite\n" +
                          "• GPS/Map intégré\n" +
                          "• Check-in/Check-out\n" +
                          "• Rapport de visite",
                          "Visites Planifiées",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void ClientEvaluation_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("✅ Évaluation Client\n\n" +
                          "Formulaire d'évaluation terrain:\n\n" +
                          "1. INFORMATIONS COMMERCIALES:\n" +
                          "   • Type d'activité\n" +
                          "   • Localisation du commerce\n" +
                          "   • Années d'expérience\n" +
                          "   • Chiffre d'affaires estimé\n\n" +
                          "2. CAPACITÉ DE REMBOURSEMENT:\n" +
                          "   • Revenus quotidiens\n" +
                          "   • Dépenses quotidiennes\n" +
                          "   • Marge bénéficiaire\n" +
                          "   • Autres sources de revenus\n\n" +
                          "3. ENVIRONNEMENT:\n" +
                          "   • Photos du commerce\n" +
                          "   • Photos du stock\n" +
                          "   • Photos du domicile\n" +
                          "   • Géolocalisation\n\n" +
                          "4. ÉVALUATION SOCIALE:\n" +
                          "   • Situation familiale\n" +
                          "   • Personnes à charge\n" +
                          "   • Références communautaires\n" +
                          "   • Historique de crédit\n\n" +
                          "5. RECOMMANDATION:\n" +
                          "   • Montant recommandé\n" +
                          "   • Durée suggérée\n" +
                          "   • Niveau de risque\n" +
                          "   • Commentaires",
                          "Évaluation Client",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void FieldDocuments_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("📸 Photos et Documents Terrain\n\n" +
                          "Gestion des documents:\n\n" +
                          "PHOTOS:\n" +
                          "• Photo du commerce/activité\n" +
                          "• Photo du stock/inventaire\n" +
                          "• Photo du domicile\n" +
                          "• Photo avec le client\n" +
                          "• Photos des garanties\n\n" +
                          "DOCUMENTS:\n" +
                          "• Scan de la carte d'identité\n" +
                          "• Justificatifs de domicile\n" +
                          "• Références\n" +
                          "• Formulaires signés\n\n" +
                          "FONCTIONNALITÉS:\n" +
                          "• Prise de photo directe\n" +
                          "• Upload depuis galerie\n" +
                          "• Géolocalisation automatique\n" +
                          "• Date/Heure automatique\n" +
                          "• Commentaires sur photos\n" +
                          "• Envoi au serveur",
                          "Photos et Documents",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void Performance_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("📊 Rapport de Performance\n\n" +
                          "VUE D'ENSEMBLE:\n" +
                          "• Nombre de demandes soumises\n" +
                          "• Taux d'approbation\n" +
                          "• Montant total décaissé\n" +
                          "• Nombre de clients actifs\n\n" +
                          "QUALITÉ DU PORTEFEUILLE:\n" +
                          "• Taux de remboursement\n" +
                          "• PAR 30 (Portfolio At Risk)\n" +
                          "• Nombre de clients en retard\n" +
                          "• Montant en retard\n\n" +
                          "ACTIVITÉ TERRAIN:\n" +
                          "• Nombre de visites effectuées\n" +
                          "• Évaluations complétées\n" +
                          "• Taux de conversion\n\n" +
                          "ÉVOLUTION:\n" +
                          "• Graphiques mensuels\n" +
                          "• Comparaison avec objectifs\n" +
                          "• Tendances",
                          "Performance Agent",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void RepaymentRate_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("📉 Analyse Taux de Remboursement\n\n" +
                          "INDICATEURS GLOBAUX:\n" +
                          "• Taux de remboursement global: 94.5%\n" +
                          "• Nombre de crédits à jour: 21/23\n" +
                          "• Nombre de crédits en retard: 2\n\n" +
                          "DÉTAILS PAR RETARD:\n" +
                          "• Retard 1-7 jours: 1 client\n" +
                          "• Retard 8-30 jours: 1 client\n" +
                          "• Retard 30+ jours: 0 client\n\n" +
                          "ACTIONS REQUISES:\n" +
                          "• Clients à relancer\n" +
                          "• Visites de suivi nécessaires\n" +
                          "• Plans de restructuration\n\n" +
                          "ÉVOLUTION:\n" +
                          "• Graphique 6 derniers mois\n" +
                          "• Comparaison avec autres agents\n" +
                          "• Objectifs de performance",
                          "Taux de Remboursement",
                          MessageBoxButton.OK,
                          MessageBoxImage.Information);
        }

        private void Logout_Click(object sender, RoutedEventArgs e)
        {
            var result = MessageBox.Show(
                "Êtes-vous sûr de vouloir vous déconnecter?",
                "Déconnexion",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question);

            if (result == MessageBoxResult.Yes)
            {
                _timer.Stop();
                // Return to login window
                var loginWindow = new LoginWindow();
                loginWindow.Show();
                this.Close();
            }
        }
    }

    // Data Models
    public class LoanApplication
    {
        public string ClientName { get; set; } = string.Empty;
        public string Amount { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    public class PaymentDue
    {
        public string ClientName { get; set; } = string.Empty;
        public string DueDate { get; set; } = string.Empty;
        public string Amount { get; set; } = string.Empty;
    }

    public class ScheduledVisit
    {
        public string Time { get; set; } = string.Empty;
        public string ClientName { get; set; } = string.Empty;
        public string Purpose { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
    }
}
