using System;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using Microsoft.Win32;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using NalaCreditDesktop.Models;

namespace NalaCreditDesktop.Services
{
    public static class DocumentPrinter
    {
        static DocumentPrinter()
        {
            // Configure QuestPDF license for Community use
            QuestPDF.Settings.License = LicenseType.Community;
        }

        public static void GenerateAndSavePDF(
            string documentType,
            SavingsAccountResponseDto account,
            SavingsCustomerResponseDto? customer,
            DateTime? startDate = null,
            DateTime? endDate = null,
            List<SavingsTransactionResponseDto>? transactions = null)
        {
            try
            {
                var saveFileDialog = new SaveFileDialog
                {
                    Filter = "PDF files (*.pdf)|*.pdf",
                    DefaultExt = ".pdf",
                    FileName = GenerateFileName(documentType, account.AccountNumber)
                };

                if (saveFileDialog.ShowDialog() == true)
                {
                    CreatePDFDocument(
                        saveFileDialog.FileName,
                        documentType,
                        account,
                        customer,
                        startDate,
                        endDate,
                        transactions);

                    MessageBox.Show(
                        $"Document PDF enregistré avec succès:\n{saveFileDialog.FileName}",
                        "PDF Créé",
                        MessageBoxButton.OK,
                        MessageBoxImage.Information);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Erreur lors de la création du PDF:\n{ex.Message}",
                    "Erreur PDF",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        }

        public static void PrintDocument(
            string documentType,
            SavingsAccountResponseDto account,
            SavingsCustomerResponseDto? customer,
            DateTime? startDate = null,
            DateTime? endDate = null,
            List<SavingsTransactionResponseDto>? transactions = null)
        {
            try
            {
                // Create temporary PDF for printing
                var tempFileName = Path.Combine(Path.GetTempPath(), GenerateFileName(documentType, account.AccountNumber));
                
                CreatePDFDocument(
                    tempFileName,
                    documentType,
                    account,
                    customer,
                    startDate,
                    endDate,
                    transactions);

                // Open with default PDF viewer for printing
                var processInfo = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = tempFileName,
                    UseShellExecute = true,
                    Verb = "print"
                };

                System.Diagnostics.Process.Start(processInfo);

                MessageBox.Show(
                    "Document envoyé à l'imprimante.\nVeuillez vérifier la file d'impression.",
                    "Impression",
                    MessageBoxButton.OK,
                    MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Erreur lors de l'impression:\n{ex.Message}",
                    "Erreur d'impression",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        }

        private static string GenerateFileName(string documentType, string accountNumber)
        {
            var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
            return $"{documentType}_{accountNumber}_{timestamp}.pdf";
        }

        private static void CreatePDFDocument(
            string filePath,
            string documentType,
            SavingsAccountResponseDto account,
            SavingsCustomerResponseDto? customer,
            DateTime? startDate,
            DateTime? endDate,
            List<SavingsTransactionResponseDto>? transactions)
        {
            Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(2, Unit.Centimetre);
                    page.DefaultTextStyle(x => x.FontSize(11).FontFamily("Arial"));

                    page.Header().Element(c => ComposeHeader(c, documentType));
                    page.Content().Element(c => ComposeContent(c, documentType, account, customer, startDate, endDate, transactions));
                    page.Footer().Element(ComposeFooter);
                });
            })
            .GeneratePdf(filePath);
        }

        private static void ComposeHeader(IContainer container, string documentType)
        {
            container.Column(column =>
            {
                column.Item().AlignCenter().Text("🏦 NALA KREDI TI MACHANN")
                    .FontSize(20).Bold().FontColor("#3B82F6");

                column.Item().AlignCenter().Text("Institution de Microfinance")
                    .FontSize(10).FontColor("#64748B");

                column.Item().PaddingVertical(10).LineHorizontal(2).LineColor("#E2E8F0");

                column.Item().PaddingTop(15).AlignCenter().Text(GetDocumentTitle(documentType))
                    .FontSize(18).Bold();

                column.Item().PaddingBottom(20);
            });
        }

        private static void ComposeContent(
            IContainer container,
            string documentType,
            SavingsAccountResponseDto account,
            SavingsCustomerResponseDto? customer,
            DateTime? startDate,
            DateTime? endDate,
            List<SavingsTransactionResponseDto>? transactions)
        {
            container.Column(column =>
            {
                // Customer and Account Information
                column.Item().Element(c => ComposeAccountInfo(c, account, customer));
                column.Item().PaddingTop(20);

                // Document-specific content
                switch (documentType)
                {
                    case "Statement":
                        column.Item().Element(c => ComposeStatementContent(c, account, startDate, endDate, transactions));
                        break;
                    case "Attestation":
                        column.Item().Element(c => ComposeAttestationContent(c, account, customer));
                        break;
                    case "Certificate":
                        column.Item().Element(c => ComposeCertificateContent(c, account, customer));
                        break;
                    case "Contract":
                        column.Item().Element(c => ComposeContractContent(c, account, customer));
                        break;
                    case "Receipt":
                        column.Item().Element(c => ComposeReceiptContent(c, account));
                        break;
                    case "Balance":
                        column.Item().Element(c => ComposeBalanceContent(c, account, customer));
                        break;
                }
            });
        }

        private static void ComposeAccountInfo(IContainer container, SavingsAccountResponseDto account, SavingsCustomerResponseDto? customer)
        {
            container.Column(column =>
            {
                column.Item().Text("INFORMATIONS DU COMPTE").Bold().FontSize(13);
                column.Item().PaddingTop(10);

                column.Item().Row(row =>
                {
                    row.RelativeItem().Column(col =>
                    {
                        col.Item().Row(r =>
                        {
                            r.ConstantItem(140).Text("Numéro de compte:").FontColor("#64748B");
                            r.RelativeItem().Text(account.AccountNumber).Bold();
                        });
                        col.Item().PaddingTop(5).Row(r =>
                        {
                            r.ConstantItem(140).Text("Titulaire:").FontColor("#64748B");
                            r.RelativeItem().Text(customer?.FullName ?? account.CustomerName).Bold();
                        });
                        col.Item().PaddingTop(5).Row(r =>
                        {
                            r.ConstantItem(140).Text("Type de compte:").FontColor("#64748B");
                            r.RelativeItem().Text(GetAccountType(account.AccountType));
                        });
                    });

                    row.RelativeItem().Column(col =>
                    {
                        col.Item().Row(r =>
                        {
                            r.ConstantItem(140).Text("Statut:").FontColor("#64748B");
                            r.RelativeItem().Text(GetStatusText(account.Status))
                                .FontColor(GetStatusColor(account.Status)).Bold();
                        });
                        col.Item().PaddingTop(5).Row(r =>
                        {
                            r.ConstantItem(140).Text("Solde actuel:").FontColor("#64748B");
                            r.RelativeItem().Text($"{account.Balance:N2} {account.Currency}").Bold().FontColor("#10b981");
                        });
                        col.Item().PaddingTop(5).Row(r =>
                        {
                            r.ConstantItem(140).Text("Date d'ouverture:").FontColor("#64748B");
                            r.RelativeItem().Text(account.OpeningDate.ToString("dd/MM/yyyy"));
                        });
                    });
                });
            });
        }

        private static void ComposeStatementContent(IContainer container, SavingsAccountResponseDto account, DateTime? startDate, DateTime? endDate, List<SavingsTransactionResponseDto>? transactions)
        {
            container.Column(column =>
            {
                column.Item().PaddingTop(10).Text(text =>
                {
                    text.Span("Période: ").FontColor("#64748B");
                    text.Span($"{startDate:dd/MM/yyyy} au {endDate:dd/MM/yyyy}").Bold();
                });

                column.Item().PaddingTop(20);

                if (transactions != null && transactions.Any())
                {
                    // Transaction count
                    column.Item().Text($"Total transactions: {transactions.Count}")
                        .FontSize(11).FontColor("#64748B").Bold();
                    
                    column.Item().PaddingTop(10);

                    // Transactions table
                    column.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(80);  // Date
                            columns.ConstantColumn(80);  // Type
                            columns.RelativeColumn();     // Référence
                            columns.ConstantColumn(80);  // Montant
                            columns.ConstantColumn(80);  // Solde
                        });

                        // Header
                        table.Header(header =>
                        {
                            header.Cell().Background("#475569").Padding(5).Text("Date").FontColor("#FFFFFF").Bold().FontSize(10);
                            header.Cell().Background("#475569").Padding(5).Text("Type").FontColor("#FFFFFF").Bold().FontSize(10);
                            header.Cell().Background("#475569").Padding(5).Text("Référence").FontColor("#FFFFFF").Bold().FontSize(10);
                            header.Cell().Background("#475569").Padding(5).Text("Montant").FontColor("#FFFFFF").Bold().FontSize(10);
                            header.Cell().Background("#475569").Padding(5).Text("Solde").FontColor("#FFFFFF").Bold().FontSize(10);
                        });

                        // Rows
                        foreach (var transaction in transactions)
                        {
                            var bgColor = transactions.IndexOf(transaction) % 2 == 0 ? "#f8fafc" : "#FFFFFF";
                            var amountColor = transaction.Type == SavingsTransactionType.Deposit || transaction.Type == SavingsTransactionType.Interest
                                ? "#10b981" : "#ef4444";

                            table.Cell().Background(bgColor).Padding(5).Text(transaction.ProcessedAt.ToString("dd/MM/yyyy HH:mm")).FontSize(9);
                            table.Cell().Background(bgColor).Padding(5).Text(GetTransactionTypeDisplay(transaction.Type)).FontSize(9);
                            table.Cell().Background(bgColor).Padding(5).Text(transaction.Reference ?? transaction.ReceiptNumber ?? "--").FontSize(9);
                            table.Cell().Background(bgColor).Padding(5).Text($"{transaction.Amount:N2}").FontColor(amountColor).Bold().FontSize(9);
                            table.Cell().Background(bgColor).Padding(5).Text($"{transaction.BalanceAfter:N2}").FontSize(9);
                        }
                    });
                }
                else
                {
                    column.Item().Text("Aucune transaction pour cette période.")
                        .Italic().FontColor("#64748B").FontSize(10);
                }
            });
        }

        private static void ComposeAttestationContent(IContainer container, SavingsAccountResponseDto account, SavingsCustomerResponseDto? customer)
        {
            container.Text(text =>
            {
                text.Line("Nous, soussignés, Institution de Microfinance NALA KREDI TI MACHANN, certifions par la présente que:");
                text.EmptyLine();
                text.Span("M./Mme ").FontSize(11);
                text.Span($"{customer?.FullName ?? account.CustomerName}").Bold().FontSize(12);
                text.EmptyLine();
                text.Line($"est titulaire d'un compte d'épargne portant le numéro {account.AccountNumber} auprès de notre institution depuis le {account.OpeningDate:dd MMMM yyyy}.");
                text.EmptyLine();
                text.Line("Ce compte est en règle et actif à la date de délivrance de la présente attestation.");
                text.EmptyLine();
                text.Line("Cette attestation est délivrée pour servir et valoir ce que de droit.");
            });
        }

        private static void ComposeCertificateContent(IContainer container, SavingsAccountResponseDto account, SavingsCustomerResponseDto? customer)
        {
            container.Column(column =>
            {
                column.Item().Text("CERTIFICAT BANCAIRE").Bold().FontSize(14).AlignCenter();
                column.Item().PaddingTop(15);

                column.Item().Text(text =>
                {
                    text.Line("La Direction de NALA KREDI TI MACHANN certifie que:");
                    text.EmptyLine();
                    text.Span($"{customer?.FullName ?? account.CustomerName}").Bold().FontSize(12);
                    text.EmptyLine();
                        text.Line($"est client(e) de notre institution et possède un compte d'épargne (N° {account.AccountNumber}) en règle.");
                    text.EmptyLine();
                    text.Span("Solde actuel: ").FontSize(11);
                    text.Span($"{account.Balance:N2} {account.Currency}").Bold().FontColor("#10b981").FontSize(12);
                    text.EmptyLine();
                    text.Line("Ce certificat est délivré à la demande de l'intéressé(e) pour servir et valoir ce que de droit.");
                });
            });
        }

        private static void ComposeContractContent(IContainer container, SavingsAccountResponseDto account, SavingsCustomerResponseDto? customer)
        {
            container.Column(column =>
            {
                column.Item().Text("CONTRAT D'OUVERTURE DE COMPTE D'ÉPARGNE").Bold().FontSize(14).AlignCenter();
                column.Item().PaddingTop(15);

                column.Item().Text(text =>
                {
                    text.Line("Entre les soussignés:");
                    text.EmptyLine();
                    text.Line("D'une part, NALA KREDI TI MACHANN, Institution de Microfinance, ci-après dénommée « l'Institution »,");
                    text.EmptyLine();
                    text.Line("Et d'autre part,");
                    text.EmptyLine();
                    text.Span($"{customer?.FullName ?? account.CustomerName}").Bold();
                    text.Span(", ci-après dénommé(e) « le Client ».");
                    text.EmptyLine();
                    text.EmptyLine();
                    text.Line("Il a été convenu ce qui suit:");
                    text.EmptyLine();
                    text.Line("Article 1: L'Institution ouvre au Client un compte d'épargne portant le numéro " + account.AccountNumber);
                    text.EmptyLine();
                    text.Line("Article 2: Le Client s'engage à respecter les conditions générales de l'Institution.");
                    text.EmptyLine();
                    text.Line("Article 3: Le présent contrat prend effet à la date d'ouverture du compte.");
                });
            });
        }

        private static void ComposeReceiptContent(IContainer container, SavingsAccountResponseDto account)
        {
            container.Column(column =>
            {
                column.Item().Text("REÇU DE TRANSACTION").Bold().FontSize(14).AlignCenter();
                column.Item().PaddingTop(15);

                column.Item().Text("Les détails de la transaction seraient affichés ici dans la version complète.")
                    .Italic().FontColor("#64748B");
            });
        }

        private static void ComposeBalanceContent(IContainer container, SavingsAccountResponseDto account, SavingsCustomerResponseDto? customer)
        {
            container.Column(column =>
            {
                column.Item().Text("ATTESTATION DE SOLDE").Bold().FontSize(14).AlignCenter();
                column.Item().PaddingTop(15);

                column.Item().Text(text =>
                {
                    text.Line("Nous, soussignés, NALA KREDI TI MACHANN, certifions que le compte:");
                    text.EmptyLine();
                    text.Span("Numéro: ").FontSize(11);
                    text.Span(account.AccountNumber).Bold().FontSize(12);
                    text.EmptyLine();
                    text.Span("Titulaire: ").FontSize(11);
                    text.Span($"{customer?.FullName ?? account.CustomerName}").Bold().FontSize(12);
                    text.EmptyLine();
                    text.EmptyLine();
                    text.Line("Présente le solde suivant à la date du " + DateTime.Now.ToString("dd/MM/yyyy") + ":");
                    text.EmptyLine();
                    text.EmptyLine();
                });

                column.Item().AlignCenter().Text($"{account.Balance:N2} {account.Currency}")
                    .Bold().FontSize(16).FontColor("#10b981");

                column.Item().Text(text =>
                {
                    text.EmptyLine();
                    text.EmptyLine();
                    text.Line("Cette attestation est délivrée pour servir et valoir ce que de droit.");
                });
            });
        }

        private static void ComposeFooter(IContainer container)
        {
            container.Column(column =>
            {
                column.Item().PaddingTop(40);
                column.Item().LineHorizontal(1).LineColor("#E2E8F0");
                column.Item().PaddingTop(15);

                column.Item().Text($"Fait à Port-au-Prince, le {DateTime.Now:dd/MM/yyyy}")
                    .FontSize(10);

                column.Item().PaddingTop(30);
                column.Item().AlignCenter().Text("________________________________")
                    .FontSize(10).FontColor("#64748B");
                column.Item().AlignCenter().Text("Signature autorisée")
                    .FontSize(10).FontColor("#64748B");

                column.Item().PaddingTop(25);
                column.Item().AlignCenter().Text("Nala Kredi Ti Machann | Port-au-Prince, Haïti | Tél: +509 XXXX-XXXX")
                    .FontSize(9).FontColor("#94a3b8");
            });
        }

        private static string GetTransactionTypeDisplay(SavingsTransactionType type)
        {
            return type switch
            {
                SavingsTransactionType.Deposit => "Dépôt",
                SavingsTransactionType.Withdrawal => "Retrait",
                SavingsTransactionType.Interest => "Intérêt",
                SavingsTransactionType.Fee => "Frais",
                SavingsTransactionType.OpeningDeposit => "Dépôt ouverture",
                _ => "Autre"
            };
        }

        private static string GetDocumentTitle(string documentType)
        {
            return documentType switch
            {
                "Attestation" => "ATTESTATION DE COMPTE",
                "Statement" => "RELEVÉ DE COMPTE",
                "Certificate" => "CERTIFICAT BANCAIRE",
                "Contract" => "CONTRAT D'OUVERTURE DE COMPTE",
                "Receipt" => "REÇU DE TRANSACTION",
                "Balance" => "ATTESTATION DE SOLDE",
                _ => "DOCUMENT"
            };
        }

        private static string GetAccountType(SavingsAccountType type)
        {
            return type switch
            {
                SavingsAccountType.Savings => "Compte d'Épargne",
                SavingsAccountType.Current => "Compte Courant",
                SavingsAccountType.TermSavings => "Épargne à Terme",
                _ => type.ToString()
            };
        }

        private static string GetStatusText(SavingsAccountStatus status)
        {
            return status switch
            {
                SavingsAccountStatus.Active => "Actif",
                SavingsAccountStatus.Inactive => "Inactif",
                SavingsAccountStatus.Closed => "Fermé",
                SavingsAccountStatus.Suspended => "Suspendu",
                _ => status.ToString()
            };
        }

        private static string GetStatusColor(SavingsAccountStatus status)
        {
            return status switch
            {
                SavingsAccountStatus.Active => "#10b981",
                SavingsAccountStatus.Inactive => "#f59e0b",
                SavingsAccountStatus.Closed => "#ef4444",
                SavingsAccountStatus.Suspended => "#f59e0b",
                _ => "#64748B"
            };
        }
    }
}
