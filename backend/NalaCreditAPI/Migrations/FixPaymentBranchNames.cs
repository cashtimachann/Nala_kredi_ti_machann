using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;

namespace NalaCreditAPI.Migrations
{
    /// <summary>
    /// Script pour corriger les noms de succursale manquants dans les paiements
    /// </summary>
    public static class PaymentBranchNameFixer
    {
        public static async Task ExecuteAsync(ApplicationDbContext context)
        {
            Console.WriteLine("🔄 Correction des noms de succursale dans les paiements...");

            // Charger tous les paiements avec leurs prêts associés
            var paymentsToUpdate = await context.MicrocreditPayments
                .Include(p => p.Loan)
                .Where(p => string.IsNullOrEmpty(p.BranchName) || p.BranchId == 0)
                .ToListAsync();

            if (!paymentsToUpdate.Any())
            {
                Console.WriteLine("✅ Aucun paiement à corriger. Tous les paiements ont déjà des succursales.");
                return;
            }

            Console.WriteLine($"📝 {paymentsToUpdate.Count} paiement(s) à corriger...");

            int updated = 0;
            int failed = 0;

            foreach (var payment in paymentsToUpdate)
            {
                if (payment.Loan != null)
                {
                    payment.BranchId = payment.Loan.BranchId;
                    payment.BranchName = payment.Loan.BranchName;
                    payment.UpdatedAt = DateTime.UtcNow;
                    updated++;
                }
                else
                {
                    Console.WriteLine($"⚠️  Paiement {payment.PaymentNumber} n'a pas de prêt associé");
                    failed++;
                }
            }

            if (updated > 0)
            {
                await context.SaveChangesAsync();
                Console.WriteLine($"✅ {updated} paiement(s) mis à jour avec succès!");
            }

            if (failed > 0)
            {
                Console.WriteLine($"⚠️  {failed} paiement(s) n'ont pas pu être corrigés (pas de prêt associé)");
            }

            // Vérifier s'il reste des paiements sans succursale
            var remainingIssues = await context.MicrocreditPayments
                .Where(p => string.IsNullOrEmpty(p.BranchName) || p.BranchId == 0)
                .CountAsync();

            if (remainingIssues > 0)
            {
                Console.WriteLine($"⚠️  {remainingIssues} paiement(s) restent sans succursale");
            }
            else
            {
                Console.WriteLine("✅ Tous les paiements ont maintenant une succursale!");
            }
        }
    }
}
