using System;
using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;

namespace NalaCreditDesktop.Views
{
    public partial class SecretaryDashboard : Window
    {
        private DispatcherTimer _timer;
        private ObservableCollection<RecentActivity> _recentActivities = new ObservableCollection<RecentActivity>();
        private ObservableCollection<Appointment> _appointments = new ObservableCollection<Appointment>();

        public SecretaryDashboard()
        {
            InitializeComponent();
            InitializeDashboard();
            SetupEventHandlers();
            StartTimer();
            LoadSampleData();
        }

        private void InitializeDashboard()
        {
            // Initialiser le nom du secrétaire
            SecretaryNameText.Text = "Marie Dupont"; // À remplacer par le nom réel

            // Mettre à jour la date et l'heure
            UpdateDateTime();
        }

        private void SetupEventHandlers()
        {
            // Menu principal
            if (DashboardButton != null)
                DashboardButton.Click += Dashboard_Click;

            // Gestion clients
            if (NewAccountButton != null)
                NewAccountButton.Click += NewAccount_Click;

            if (UpdateClientButton != null)
                UpdateClientButton.Click += UpdateClient_Click;

            if (ConsultAccountButton != null)
                ConsultAccountButton.Click += ConsultAccount_Click;

            // Documents
            if (KYCButton != null)
                KYCButton.Click += KYC_Click;

            if (DigitizationButton != null)
                DigitizationButton.Click += Digitization_Click;

            if (PassbookButton != null)
                PassbookButton.Click += Passbook_Click;

            if (PrintButton != null)
                PrintButton.Click += Print_Click;

            // Organisation
            if (AppointmentButton != null)
                AppointmentButton.Click += Appointment_Click;

            if (RequestsButton != null)
                RequestsButton.Click += Requests_Click;

            // Rapports
            if (ReportsButton != null)
                ReportsButton.Click += Reports_Click;

            // Header buttons
            if (NotificationButton != null)
                NotificationButton.Click += Notification_Click;

            if (LogoutButton != null)
                LogoutButton.Click += Logout_Click;
        }

        private void StartTimer()
        {
            _timer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(1)
            };
            _timer.Tick += Timer_Tick;
            _timer.Start();
        }

        private void Timer_Tick(object? sender, EventArgs e)
        {
            UpdateDateTime();
        }

        private void UpdateDateTime()
        {
            if (TimeText != null)
                TimeText.Text = DateTime.Now.ToString("HH:mm:ss");

            if (DateText != null)
                DateText.Text = DateTime.Now.ToString("dd/MM/yyyy");
        }

        private void LoadSampleData()
        {
            // Charger les statistiques
            if (AccountsCreatedText != null)
                AccountsCreatedText.Text = "5";

            if (DocumentsProcessedText != null)
                DocumentsProcessedText.Text = "12";

            if (AppointmentsText != null)
                AppointmentsText.Text = "3";

            if (PendingRequestsText != null)
                PendingRequestsText.Text = "7";

            // Activités récentes
            _recentActivities.Clear();
            _recentActivities.Add(new RecentActivity
            {
                Time = "14:30",
                Type = "Nouveau Compte",
                Description = "Compte épargne créé pour Jean Pierre",
                Status = "✅ Complété"
            });
            _recentActivities.Add(new RecentActivity
            {
                Time = "13:15",
                Type = "Document KYC",
                Description = "Pièces d'identité numérisées - Marie Carmel",
                Status = "✅ Complété"
            });
            _recentActivities.Add(new RecentActivity
            {
                Time = "11:45",
                Type = "Mise à jour",
                Description = "Informations contact mises à jour - Paul Louis",
                Status = "✅ Complété"
            });
            _recentActivities.Add(new RecentActivity
            {
                Time = "10:20",
                Type = "Impression",
                Description = "Attestation de compte imprimée",
                Status = "✅ Complété"
            });

            if (RecentActivitiesGrid != null)
                RecentActivitiesGrid.ItemsSource = _recentActivities;

            // Rendez-vous du jour
            _appointments.Clear();
            _appointments.Add(new Appointment
            {
                Time = "15:00",
                ClientName = "Rose Michel",
                Purpose = "Ouverture compte à terme"
            });
            _appointments.Add(new Appointment
            {
                Time = "16:30",
                ClientName = "Pierre Baptiste",
                Purpose = "Mise à jour informations"
            });
            _appointments.Add(new Appointment
            {
                Time = "17:00",
                ClientName = "Marie Joseph",
                Purpose = "Consultation générale"
            });

            if (AppointmentsList != null)
                AppointmentsList.ItemsSource = _appointments;
        }

        private void LoadDashboardView()
        {
            try
            {
                var scrollViewer = MainContentScrollViewer;
                var mainDashboard = MainDashboardGrid;

                if (scrollViewer != null && mainDashboard != null)
                {
                    scrollViewer.Content = mainDashboard;
                    LoadSampleData();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors du chargement du dashboard: {ex.Message}", 
                              "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        #region Event Handlers

        private void Dashboard_Click(object sender, RoutedEventArgs e)
        {
            LoadDashboardView();
        }

        private void NewAccount_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Module de création de nouveau compte\n\nFonctionnalités:\n" +
                          "• Compte d'épargne\n" +
                          "• Compte courant\n" +
                          "• Compte à terme\n" +
                          "• Validation des informations\n" +
                          "• Vérification KYC", 
                          "Nouveau Compte", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void UpdateClient_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Module de mise à jour des informations clients\n\nFonctionnalités:\n" +
                          "• Modification des coordonnées\n" +
                          "• Mise à jour des documents\n" +
                          "• Changement de statut\n" +
                          "• Historique des modifications", 
                          "Mise à Jour Client", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void ConsultAccount_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Module de consultation de comptes (Lecture seule)\n\nFonctionnalités:\n" +
                          "• Visualisation des informations\n" +
                          "• Historique des transactions\n" +
                          "• Documents associés\n" +
                          "• Soldes et mouvements", 
                          "Consultation Compte", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void KYC_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Module de gestion des documents KYC\n\nFonctionnalités:\n" +
                          "• Gestion des pièces d'identité\n" +
                          "• Justificatifs de domicile\n" +
                          "• Documents professionnels\n" +
                          "• Validation et conformité\n" +
                          "• Archivage sécurisé", 
                          "Documents KYC", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void Digitization_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Module de numérisation et archivage\n\nFonctionnalités:\n" +
                          "• Scan de documents\n" +
                          "• OCR (reconnaissance de texte)\n" +
                          "• Indexation automatique\n" +
                          "• Stockage sécurisé\n" +
                          "• Recherche rapide", 
                          "Numérisation", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void Passbook_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Module d'émission de livrets d'épargne\n\nFonctionnalités:\n" +
                          "• Création de livrets\n" +
                          "• Impression personnalisée\n" +
                          "• Numérotation automatique\n" +
                          "• Suivi des émissions\n" +
                          "• Renouvellement", 
                          "Livrets d'Épargne", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void Print_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Module d'impression de documents\n\nFonctionnalités:\n" +
                          "• Attestations de compte\n" +
                          "• Relevés détaillés\n" +
                          "• Certificats\n" +
                          "• Contrats\n" +
                          "• Reçus et bordereaux", 
                          "Impression", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void Appointment_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Module de gestion des rendez-vous\n\nFonctionnalités:\n" +
                          "• Planification de rendez-vous\n" +
                          "• Calendrier interactif\n" +
                          "• Rappels automatiques\n" +
                          "• Gestion des salles\n" +
                          "• Confirmation et annulation", 
                          "Rendez-vous", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void Requests_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Module de traitement des demandes clients\n\nFonctionnalités:\n" +
                          "• Réception des demandes\n" +
                          "• Catégorisation automatique\n" +
                          "• Affectation et suivi\n" +
                          "• Réponses standardisées\n" +
                          "• Historique complet", 
                          "Demandes Clients", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void Reports_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Module de rapports\n\nFonctionnalités:\n" +
                          "• Rapport d'activité quotidien\n" +
                          "• Statistiques de création de comptes\n" +
                          "• Documents traités\n" +
                          "• Performance individuelle\n" +
                          "• Export Excel/PDF", 
                          "Rapports", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void Notification_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Centre de notifications\n\n" +
                          "• Nouvelles demandes clients\n" +
                          "• Rappels de rendez-vous\n" +
                          "• Documents à valider\n" +
                          "• Alertes système", 
                          "Notifications", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void Logout_Click(object sender, RoutedEventArgs e)
        {
            var result = MessageBox.Show("Êtes-vous sûr de vouloir vous déconnecter?", 
                                       "Déconnexion", 
                                       MessageBoxButton.YesNo, 
                                       MessageBoxImage.Question);

            if (result == MessageBoxResult.Yes)
            {
                _timer?.Stop();
                
                var loginWindow = new LoginWindow();
                loginWindow.Show();
                this.Close();
            }
        }

        #endregion

        protected override void OnClosed(EventArgs e)
        {
            _timer?.Stop();
            base.OnClosed(e);
        }
    }

    // Modèles de données
    public class RecentActivity
    {
        public string Time { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    public class Appointment
    {
        public string Time { get; set; } = string.Empty;
        public string ClientName { get; set; } = string.Empty;
        public string Purpose { get; set; } = string.Empty;
    }
}
