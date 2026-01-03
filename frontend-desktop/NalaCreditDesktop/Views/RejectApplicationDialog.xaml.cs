using System;
using System.Windows;
using System.Windows.Controls;

namespace NalaCreditDesktop.Views
{
    public partial class RejectApplicationDialog : Window
    {
        public string RejectionReason { get; private set; } = string.Empty;
        public string Comments { get; private set; } = string.Empty;

        public RejectApplicationDialog(string applicationNumber)
        {
            InitializeComponent();
            ApplicationNumberText.Text = $"Demande {applicationNumber}";
            
            ValidateInputs();
        }

        private void RejectButton_Click(object sender, RoutedEventArgs e)
        {
            if (!ValidateInputs())
            {
                return;
            }

            var selectedItem = ReasonComboBox.SelectedItem as ComboBoxItem;
            RejectionReason = selectedItem?.Content.ToString() ?? string.Empty;
            Comments = CommentsTextBox.Text ?? string.Empty;

            // Confirmation dialog
            var result = MessageBox.Show(
                $"Êtes-vous sûr de vouloir rejeter cette demande?\n\nRaison: {RejectionReason}\n\nCette action est irréversible.",
                "Confirmer le Rejet",
                MessageBoxButton.YesNo,
                MessageBoxImage.Warning);

            if (result == MessageBoxResult.Yes)
            {
                DialogResult = true;
                Close();
            }
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
            Close();
        }

        private bool ValidateInputs()
        {
            // Check if reason is selected
            if (ReasonComboBox.SelectedItem == null)
            {
                ShowValidationMessage("Veuillez sélectionner une raison de rejet");
                RejectButton.IsEnabled = false;
                return false;
            }

            // Check if comments are provided
            if (string.IsNullOrWhiteSpace(CommentsTextBox.Text))
            {
                ShowValidationMessage("Veuillez fournir des commentaires détaillés (minimum 20 caractères)");
                RejectButton.IsEnabled = false;
                return false;
            }

            if (CommentsTextBox.Text.Trim().Length < 20)
            {
                ShowValidationMessage("Les commentaires doivent contenir au moins 20 caractères");
                RejectButton.IsEnabled = false;
                return false;
            }

            HideValidationMessage();
            RejectButton.IsEnabled = true;
            return true;
        }

        private void ShowValidationMessage(string message)
        {
            ValidationMessageText.Text = message;
            ValidationMessageText.Visibility = Visibility.Visible;
        }

        private void HideValidationMessage()
        {
            ValidationMessageText.Visibility = Visibility.Collapsed;
        }

        private void ReasonComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            ValidateInputs();
        }

        private void CommentsTextBox_TextChanged(object sender, TextChangedEventArgs e)
        {
            ValidateInputs();
        }
    }
}
