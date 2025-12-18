using System;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using NalaCreditDesktop.Services;
using NalaCreditDesktop.Views;

namespace NalaCreditDesktop;

public partial class App : Application
{
    // Configuration de l'application
    private const string CurrentVersion = "1.0.0";
    private const string ApiBaseUrl = "https://admin.nalakreditimachann.com";
    
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

        // Tcheke mizajou anvan lanse aplikasyon
        // Check for updates before launching application
        CheckForUpdatesAsync().ContinueWith(t =>
        {
            if (t.IsFaulted)
            {
                System.Diagnostics.Debug.WriteLine($"Update check failed: {t.Exception?.Message}");
            }
        });

        // Vérifier les arguments de ligne de commande
        if (e.Args.Contains("--dashboard") || e.Args.Contains("-d"))
        {
            // Lancer directement le dashboard caissier
            try
            {
                var dashboard = new Views.CashierDashboard();
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

    /// <summary>
    /// Tcheke si gen mizajou disponib ak montre dialog
    /// Check for available updates and show dialog
    /// </summary>
    private async Task CheckForUpdatesAsync()
    {
        try
        {
            var updateService = new UpdateService(ApiBaseUrl, CurrentVersion);
            var updateInfo = await updateService.CheckForUpdatesAsync();

            if (updateInfo != null)
            {
                System.Diagnostics.Debug.WriteLine($"[App] Update available: {updateInfo.LatestVersion}");

                // Dispatch sou UI thread
                await Dispatcher.InvokeAsync(() =>
                {
                    ShowUpdateDialog(updateInfo, updateService);
                });
            }
            else
            {
                System.Diagnostics.Debug.WriteLine("[App] No updates available");
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[App] Update check error: {ex.Message}");
            // Pa afiche erè pou pa deranje itilizatè
        }
    }

    /// <summary>
    /// Afiche dialog mizajou
    /// Show update dialog
    /// </summary>
    private void ShowUpdateDialog(UpdateInfo updateInfo, UpdateService updateService)
    {
        var message = $"📦 Nouvo vèsyon disponib!\n\n" +
                     $"Vèsyon Aktyèl: {CurrentVersion}\n" +
                     $"Nouvo Vèsyon: {updateInfo.LatestVersion}\n" +
                     $"Dat: {updateInfo.ReleaseDate}\n" +
                     $"Gwosè: {updateInfo.FileSizeFormatted}\n\n" +
                     $"Chanjman:\n{updateInfo.ReleaseNotes}\n\n" +
                     $"Èske w vle telechaje epi enstale mizajou kounye a?";

        var title = updateInfo.Mandatory ? "⚠️ Mizajou Obligatwa" : "Mizajou Disponib";
        var button = updateInfo.Mandatory ? MessageBoxButton.OK : MessageBoxButton.YesNo;

        var result = MessageBox.Show(message, title, button, MessageBoxImage.Information);

        if (result == MessageBoxResult.Yes || result == MessageBoxResult.OK)
        {
            // Montre progress dialog
            var progressWindow = new Window
            {
                Title = "Telechajman Mizajou",
                Width = 400,
                Height = 150,
                WindowStartupLocation = WindowStartupLocation.CenterScreen,
                ResizeMode = ResizeMode.NoResize,
                WindowStyle = WindowStyle.ToolWindow
            };

            var stackPanel = new System.Windows.Controls.StackPanel
            {
                Margin = new Thickness(20)
            };

            var statusText = new System.Windows.Controls.TextBlock
            {
                Text = "Ap telechaje mizajou...",
                Margin = new Thickness(0, 0, 0, 10),
                FontSize = 14
            };

            var progressBar = new System.Windows.Controls.ProgressBar
            {
                Height = 25,
                Minimum = 0,
                Maximum = 100,
                Value = 0
            };

            var percentText = new System.Windows.Controls.TextBlock
            {
                Text = "0%",
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 10, 0, 0),
                FontWeight = FontWeights.Bold
            };

            stackPanel.Children.Add(statusText);
            stackPanel.Children.Add(progressBar);
            stackPanel.Children.Add(percentText);

            progressWindow.Content = stackPanel;
            progressWindow.Show();

            var progress = new Progress<int>(percent =>
            {
                progressBar.Value = percent;
                percentText.Text = $"{percent}%";
            });

            // Telechaje mizajou asynchronously
            Task.Run(async () =>
            {
                var success = await updateService.DownloadAndInstallUpdateAsync(updateInfo, progress);
                
                if (!success)
                {
                    await Dispatcher.InvokeAsync(() =>
                    {
                        progressWindow.Close();
                    });
                }
            });
        }
        else if (updateInfo.Mandatory)
        {
            MessageBox.Show(
                "Mizajou sa obligatwa pou kontinye itilize aplikasyon an.\n\nAplikasyon pral fèmen.",
                "Mizajou Obligatwa",
                MessageBoxButton.OK,
                MessageBoxImage.Warning
            );
            Shutdown();
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

