using System;
using System.Windows;
using System.Windows.Controls;

namespace NalaCreditDesktop.Views
{
    public partial class OptionalPlotHost : UserControl
    {
        public bool IsAvailable { get; private set; } = false;
        public FrameworkElement? PlotControl { get; private set; }

        public OptionalPlotHost()
        {
            InitializeComponent();
            Loaded += OptionalPlotHost_Loaded;
        }

        private void OptionalPlotHost_Loaded(object? sender, RoutedEventArgs e)
        {
            TryInitializePlotControl();
        }

        private void TryInitializePlotControl()
        {
            try
            {
                // Try to get the ScottPlot WpfPlot type by assembly-qualified name
                var type = Type.GetType("ScottPlot.WPF.WpfPlot, ScottPlot.WPF");
                if (type == null)
                {
                    ShowPlaceholder("Graphiques désactivés (module ScottPlot.WPF manquant)");
                    IsAvailable = false;
                    return;
                }

                // Create instance of WpfPlot
                var instance = Activator.CreateInstance(type) as FrameworkElement;
                if (instance == null)
                {
                    ShowPlaceholder("Impossible d'initialiser le module graphique");
                    IsAvailable = false;
                    return;
                }

                // Configure the plot control to fill the host
                instance.HorizontalAlignment = HorizontalAlignment.Stretch;
                instance.VerticalAlignment = VerticalAlignment.Stretch;

                RootGrid.Children.Clear();
                RootGrid.Children.Add(instance);

                PlotControl = instance;
                IsAvailable = true;
            }
            catch (Exception ex)
            {
                // If anything goes wrong, show placeholder and log
                Console.Error.WriteLine($"[ERROR] OptionalPlotHost initialization failed: {ex}");
                ShowPlaceholder("Graphiques désactivés (erreur d'initialisation)");
                IsAvailable = false;
            }
        }

        private void ShowPlaceholder(string message)
        {
            RootGrid.Children.Clear();
            var text = new TextBlock
            {
                Text = message,
                FontSize = 14,
                Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(148, 163, 184)),
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
                TextWrapping = TextWrapping.Wrap
            };
            RootGrid.Children.Add(text);
        }
    }
}