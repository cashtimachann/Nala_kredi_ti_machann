using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using Microsoft.Win32;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using NalaCreditDesktop.Models;

namespace NalaCreditDesktop.Services
{
    public static class CashierTransactionPrinter
    {
        static CashierTransactionPrinter()
        {
            QuestPDF.Settings.License = LicenseType.Community;
        }

        public static void PrintCashierTransactions(
            SavingsAccountResponseDto account,
            SavingsCustomerResponseDto? customer,
            DateTime startDate,
            DateTime endDate,
            List<SavingsTransactionResponseDto> transactions,
            decimal cashBalanceHTG,
            decimal cashBalanceUSD,
            int totalTransactionCount)
        {
            try
            {
                var tempFileName = Path.Combine(Path.GetTempPath(), $"RapportCaissier_{DateTime.Now:yyyyMMddHHmmss}.pdf");
                
                CreateCashierReportPDF(
                    tempFileName,
                    account,
                    customer,
                    startDate,
                    endDate,
                    transactions,
                    cashBalanceHTG,
                    cashBalanceUSD,
                    totalTransactionCount);

                // Open with print dialog
                var printProcess = new ProcessStartInfo
                {
                    FileName = tempFileName,
                    UseShellExecute = true,
                    Verb = "print"
                };
                Process.Start(printProcess);
            }
            catch (Exception ex)
            {
                throw new Exception($"Erreur lors de l'impression: {ex.Message}", ex);
            }
        }

        public static void SaveCashierTransactionsPDF(
            SavingsAccountResponseDto account,
            SavingsCustomerResponseDto? customer,
            DateTime startDate,
            DateTime endDate,
            List<SavingsTransactionResponseDto> transactions,
            decimal cashBalanceHTG,
            decimal cashBalanceUSD,
            int totalTransactionCount)
        {
            try
            {
                var saveFileDialog = new SaveFileDialog
                {
                    Filter = "PDF Files (*.pdf)|*.pdf",
                    FileName = $"Rapport_Caissier_{startDate:yyyyMMdd}_{endDate:yyyyMMdd}.pdf",
                    DefaultExt = "pdf"
                };

                if (saveFileDialog.ShowDialog() == true)
                {
                    CreateCashierReportPDF(
                        saveFileDialog.FileName,
                        account,
                        customer,
                        startDate,
                        endDate,
                        transactions,
                        cashBalanceHTG,
                        cashBalanceUSD,
                        totalTransactionCount);
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Erreur lors de l'enregistrement: {ex.Message}", ex);
            }
        }

        private static void CreateCashierReportPDF(
            string filePath,
            SavingsAccountResponseDto account,
            SavingsCustomerResponseDto? customer,
            DateTime startDate,
            DateTime endDate,
            List<SavingsTransactionResponseDto> transactions,
            decimal cashBalanceHTG,
            decimal cashBalanceUSD,
            int totalTransactionCount)
        {
            Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(2, Unit.Centimetre);
                    page.Header().Element(c => ComposeHeader(c));
                    page.Content().Element(c => ComposeContent(c, account, customer, startDate, endDate, transactions, cashBalanceHTG, cashBalanceUSD, totalTransactionCount));
                    page.Footer().Element(ComposeFooter);
                });
            }).GeneratePdf(filePath);
        }

        private static void ComposeHeader(IContainer container)
        {
            container.Column(column =>
            {
                column.Item().AlignCenter().Text("NALA KREDI TI MACHANN")
                    .FontSize(20).Bold().FontColor("#2C3E50");
                
                column.Item().AlignCenter().Text("Rapport de Transactions - Caissier")
                    .FontSize(14).FontColor("#34495E");
                
                column.Item().PaddingVertical(10).LineHorizontal(1).LineColor("#BDC3C7");
            });
        }

        private static void ComposeContent(
            IContainer container,
            SavingsAccountResponseDto account,
            SavingsCustomerResponseDto? customer,
            DateTime startDate,
            DateTime endDate,
            List<SavingsTransactionResponseDto> transactions,
            decimal cashBalanceHTG,
            decimal cashBalanceUSD,
            int totalTransactionCount)
        {
            container.Column(column =>
            {
                // Cashier info
                column.Item().Element(c => ComposeCashierInfo(c, customer, startDate, endDate));
                column.Item().PaddingTop(20);

                // Cash balance summary
                column.Item().Element(c => ComposeCashBalance(c, cashBalanceHTG, cashBalanceUSD));
                column.Item().PaddingTop(20);

                // Transaction statistics
                column.Item().Element(c => ComposeTransactionStats(c, transactions, totalTransactionCount));
                column.Item().PaddingTop(20);

                // Transactions list
                column.Item().Element(c => ComposeTransactionsList(c, transactions));
            });
        }

        private static void ComposeCashierInfo(IContainer container, SavingsCustomerResponseDto? customer, DateTime startDate, DateTime endDate)
        {
            container.Column(column =>
            {
                column.Item().Text("Informations du Caissier")
                    .FontSize(14).Bold().FontColor("#2C3E50");
                
                column.Item().PaddingTop(10);

                column.Item().Row(row =>
                {
                    row.RelativeItem().Column(leftColumn =>
                    {
                        leftColumn.Item().Text(text =>
                        {
                            text.Span("Caissier: ").FontColor("#7F8C8D").FontSize(11);
                            text.Span($"{customer?.FirstName} {customer?.LastName}").Bold().FontSize(11);
                        });
                        
                        leftColumn.Item().Text(text =>
                        {
                            text.Span("Période: ").FontColor("#7F8C8D").FontSize(11);
                            text.Span($"{startDate:dd/MM/yyyy} au {endDate:dd/MM/yyyy}").Bold().FontSize(11);
                        });
                    });

                    row.RelativeItem().Column(rightColumn =>
                    {
                        rightColumn.Item().Text(text =>
                        {
                            text.Span("Date d'impression: ").FontColor("#7F8C8D").FontSize(11);
                            text.Span($"{DateTime.Now:dd/MM/yyyy HH:mm}").Bold().FontSize(11);
                        });
                    });
                });
            });
        }

        private static void ComposeCashBalance(IContainer container, decimal balanceHTG, decimal balanceUSD)
        {
            container.Column(column =>
            {
                column.Item().Text("Solde de Caisse")
                    .FontSize(14).Bold().FontColor("#2C3E50");
                
                column.Item().PaddingTop(10);

                column.Item().Row(row =>
                {
                    row.RelativeItem().Background("#E8F5E9").Padding(10).Text(text =>
                    {
                        text.Span("HTG: ").FontSize(11).FontColor("#2C3E50");
                        text.Span($"{balanceHTG:N2}").Bold().FontSize(13).FontColor("#27AE60");
                    });

                    row.Spacing(10);

                    row.RelativeItem().Background("#E3F2FD").Padding(10).Text(text =>
                    {
                        text.Span("USD: ").FontSize(11).FontColor("#2C3E50");
                        text.Span($"{balanceUSD:N2}").Bold().FontSize(13).FontColor("#3498DB");
                    });
                });
            });
        }

        private static void ComposeTransactionStats(IContainer container, List<SavingsTransactionResponseDto> transactions, int totalCount)
        {
            var deposits = transactions.Where(t => t.Type == SavingsTransactionType.Deposit || t.Type == SavingsTransactionType.OpeningDeposit);
            var withdrawals = transactions.Where(t => t.Type == SavingsTransactionType.Withdrawal);
            
            var totalDeposits = deposits.Sum(t => t.Amount);
            var totalWithdrawals = withdrawals.Sum(t => t.Amount);

            container.Column(column =>
            {
                column.Item().Text("Statistiques des Transactions")
                    .FontSize(14).Bold().FontColor("#2C3E50");
                
                column.Item().PaddingTop(10);

                column.Item().Row(row =>
                {
                    row.RelativeItem().Column(col =>
                    {
                        col.Item().Text($"Nombre total: {totalCount}").FontSize(11);
                        col.Item().Text($"Transactions affichées: {transactions.Count}").FontSize(11);
                    });

                    row.RelativeItem().Column(col =>
                    {
                        col.Item().Text(text =>
                        {
                            text.Span("Total Dépôts: ").FontSize(11);
                            text.Span($"{totalDeposits:N2}").Bold().FontColor("#27AE60").FontSize(11);
                        });
                        col.Item().Text(text =>
                        {
                            text.Span("Total Retraits: ").FontSize(11);
                            text.Span($"{totalWithdrawals:N2}").Bold().FontColor("#E74C3C").FontSize(11);
                        });
                    });
                });
            });
        }

        private static void ComposeTransactionsList(IContainer container, List<SavingsTransactionResponseDto> transactions)
        {
            container.Column(column =>
            {
                column.Item().PaddingTop(10).Text(text =>
                {
                    text.Span("Liste des Transactions").FontColor("#2C3E50").Bold().FontSize(14);
                });

                column.Item().PaddingTop(10);

                if (transactions != null && transactions.Any())
                {
                    column.Item().Text($"Total: {transactions.Count} transaction(s)")
                        .FontSize(11).FontColor("#7F8C8D").Bold();
                    
                    column.Item().PaddingTop(10);

                    // Transactions table
                    column.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(80);  // Date
                            columns.ConstantColumn(80);  // Type
                            columns.RelativeColumn();     // Client/Référence
                            columns.ConstantColumn(80);  // Montant
                        });

                        // Header
                        table.Header(header =>
                        {
                            header.Cell().Background("#475569").Padding(5).Text("Date").FontColor("#FFFFFF").Bold().FontSize(10);
                            header.Cell().Background("#475569").Padding(5).Text("Type").FontColor("#FFFFFF").Bold().FontSize(10);
                            header.Cell().Background("#475569").Padding(5).Text("Client/Réf").FontColor("#FFFFFF").Bold().FontSize(10);
                            header.Cell().Background("#475569").Padding(5).Text("Montant").FontColor("#FFFFFF").Bold().FontSize(10);
                        });

                        // Rows
                        foreach (var transaction in transactions)
                        {
                            var bgColor = transactions.IndexOf(transaction) % 2 == 0 ? "#f8fafc" : "#FFFFFF";
                            var amountColor = transaction.Type == SavingsTransactionType.Deposit || 
                                            transaction.Type == SavingsTransactionType.Interest ||
                                            transaction.Type == SavingsTransactionType.OpeningDeposit
                                ? "#10b981" : "#ef4444";

                            table.Cell().Background(bgColor).Padding(5).Text(transaction.ProcessedAt.ToString("dd/MM/yyyy HH:mm")).FontSize(9);
                            table.Cell().Background(bgColor).Padding(5).Text(GetTransactionTypeDisplay(transaction.Type)).FontSize(9);
                            table.Cell().Background(bgColor).Padding(5).Text(transaction.Description ?? transaction.Reference ?? "--").FontSize(9);
                            table.Cell().Background(bgColor).Padding(5).Text($"{transaction.Amount:N2}").FontColor(amountColor).Bold().FontSize(9);
                        }
                    });
                }
                else
                {
                    column.Item().Text("Aucune transaction pour cette période.")
                        .Italic().FontColor("#7F8C8D").FontSize(10);
                }
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

        private static void ComposeFooter(IContainer container)
        {
            container.Column(column =>
            {
                column.Item().LineHorizontal(1).LineColor("#BDC3C7");
                column.Item().PaddingVertical(5);
                
                column.Item().Row(row =>
                {
                    row.RelativeItem().AlignLeft().Text($"Généré le {DateTime.Now:dd/MM/yyyy à HH:mm}")
                        .FontSize(9).FontColor("#7F8C8D");
                    
                    row.RelativeItem().AlignRight().Text(text =>
                    {
                        text.Span("Page ").FontSize(9).FontColor("#7F8C8D");
                        text.CurrentPageNumber().FontSize(9).FontColor("#7F8C8D");
                        text.Span(" / ").FontSize(9).FontColor("#7F8C8D");
                        text.TotalPages().FontSize(9).FontColor("#7F8C8D");
                    });
                });

                column.Item().AlignCenter().Text("Nala Kredi Ti Machann - Système de Gestion")
                    .FontSize(8).FontColor("#95A5A6");
            });
        }
    }
}
