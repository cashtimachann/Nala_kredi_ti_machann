using System;
using System.Linq;
using System.Windows;
using NalaCreditDesktop.Views;

namespace NalaCreditDesktop;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        // Global exception handlers to capture uncaught errors and help diagnose
        this.DispatcherUnhandledException += (s, ex) =>
        {
            try
            {
                LogUnhandledException(ex.Exception, "DispatcherUnhandledException");
            }
            catch { }
            MessageBox.Show($"Une erreur inattendue est survenue:\n{ex.Exception.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
            ex.Handled = true;
        };

        AppDomain.CurrentDomain.UnhandledException += (s, ex) =>
        {
            try
            {
                LogUnhandledException(ex.ExceptionObject as Exception, "AppDomain.UnhandledException");
            }
            catch { }
        };

        // Vérifier les arguments de ligne de commande
        if (e.Args.Contains("--dashboard") || e.Args.Contains("-d"))
        {
            // Lancer directement le dashboard caissier
            try
            {
                var dashboard = new CashierDashboard();
                this.MainWindow = dashboard;
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

    private static void LogUnhandledException(Exception? ex, string source)
    {
        try
        {
            var folder = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var appFolder = System.IO.Path.Combine(folder, "NalaCreditDesktop");
            if (!System.IO.Directory.Exists(appFolder))
                System.IO.Directory.CreateDirectory(appFolder);

            var logFile = System.IO.Path.Combine(appFolder, "error.log");
            var sb = new System.Text.StringBuilder();
            sb.AppendLine("--- Unhandled Exception ---");
            sb.AppendLine($"Source: {source}");
            sb.AppendLine($"Time: {DateTime.Now:O}");
            if (ex != null)
            {
                sb.AppendLine(ex.ToString());
            }
            else
            {
                sb.AppendLine("No exception object available.");
            }
            sb.AppendLine();
            System.IO.File.AppendAllText(logFile, sb.ToString());
        }
        catch
        {
            // If logging fails, do nothing - we must not throw from global handler
        }
    }
}

