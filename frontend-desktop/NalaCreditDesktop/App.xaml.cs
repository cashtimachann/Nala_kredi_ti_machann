using System;
using System.Linq;
using System.Windows;
using NalaCreditDesktop.Views;

namespace NalaCreditDesktop;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        // Vérifier les arguments de ligne de commande
        if (e.Args.Contains("--dashboard") || e.Args.Contains("-d"))
        {
            // Lancer directement le dashboard caissier
            try
            {
                var dashboard = new CashierDashboard();
                dashboard.Show();
                
                // Ne pas utiliser le StartupUri par défaut
                this.ShutdownMode = ShutdownMode.OnLastWindowClose;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors du lancement du dashboard: {ex.Message}", 
                               "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                this.Shutdown();
            }
        }
        else
        {
            // Comportement normal - utiliser StartupUri défini dans App.xaml
            base.OnStartup(e);
        }
    }
}

