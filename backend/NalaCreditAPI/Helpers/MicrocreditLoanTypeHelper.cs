using NalaCreditAPI.Models;

namespace NalaCreditAPI.Helpers
{
    /// <summary>
    /// Classe utilitaire pour gérer les types de microcrédits
    /// </summary>
    public static class MicrocreditLoanTypeHelper
    {
        /// <summary>
        /// Obtenir le nom en français pour un type de crédit
        /// </summary>
        public static string GetLoanTypeName(MicrocreditLoanType loanType)
        {
            return loanType switch
            {
                MicrocreditLoanType.Commercial => "Crédit Commercial",
                MicrocreditLoanType.Agricultural => "Crédit Agricole (Standard)",
                MicrocreditLoanType.Personal => "Crédit Personnel (Standard)",
                MicrocreditLoanType.Emergency => "Crédit d'Urgence",
                MicrocreditLoanType.CreditLoyer => "Crédit Loyer",
                MicrocreditLoanType.CreditAuto => "Crédit Auto",
                MicrocreditLoanType.CreditMoto => "Crédit Moto",
                MicrocreditLoanType.CreditPersonnel => "Crédit Personnel",
                MicrocreditLoanType.CreditScolaire => "Crédit Scolaire",
                MicrocreditLoanType.CreditAgricole => "Crédit Agricole",
                MicrocreditLoanType.CreditProfessionnel => "Crédit Professionnel",
                MicrocreditLoanType.CreditAppui => "Crédit d'Appui",
                MicrocreditLoanType.CreditHypothecaire => "Crédit Hypothécaire",
                _ => loanType.ToString()
            };
        }

        /// <summary>
        /// Obtenir la description pour un type de crédit
        /// </summary>
        public static string GetLoanTypeDescription(MicrocreditLoanType loanType)
        {
            return loanType switch
            {
                MicrocreditLoanType.Commercial => "Financement pour activités commerciales",
                MicrocreditLoanType.Agricultural => "Financement pour activités agricoles (standard)",
                MicrocreditLoanType.Personal => "Prêt personnel à usage général",
                MicrocreditLoanType.Emergency => "Prêt d'urgence pour situations critiques",
                MicrocreditLoanType.CreditLoyer => "Financement pour le paiement du loyer résidentiel ou commercial",
                MicrocreditLoanType.CreditAuto => "Financement pour l'achat d'un véhicule automobile",
                MicrocreditLoanType.CreditMoto => "Financement pour l'achat d'une motocyclette",
                MicrocreditLoanType.CreditPersonnel => "Prêt personnel pour besoins divers (événements, urgences, etc.)",
                MicrocreditLoanType.CreditScolaire => "Financement pour frais scolaires, universitaires et matériel éducatif",
                MicrocreditLoanType.CreditAgricole => "Financement pour activités agricoles (semences, équipement, intrants)",
                MicrocreditLoanType.CreditProfessionnel => "Financement pour activités professionnelles et entrepreneuriales",
                MicrocreditLoanType.CreditAppui => "Prêt de soutien pour situations d'urgence ou besoins immédiats",
                MicrocreditLoanType.CreditHypothecaire => "Financement pour achat immobilier avec garantie hypothécaire",
                _ => "Type de crédit non défini"
            };
        }

        /// <summary>
        /// Obtenir l'icône recommandée pour un type de crédit
        /// </summary>
        public static string GetLoanTypeIcon(MicrocreditLoanType loanType)
        {
            return loanType switch
            {
                MicrocreditLoanType.Commercial => "shopping-cart",
                MicrocreditLoanType.Agricultural => "leaf",
                MicrocreditLoanType.Personal => "user",
                MicrocreditLoanType.Emergency => "alert-circle",
                MicrocreditLoanType.CreditLoyer => "home",
                MicrocreditLoanType.CreditAuto => "car",
                MicrocreditLoanType.CreditMoto => "motorcycle",
                MicrocreditLoanType.CreditPersonnel => "users",
                MicrocreditLoanType.CreditScolaire => "book",
                MicrocreditLoanType.CreditAgricole => "tractor",
                MicrocreditLoanType.CreditProfessionnel => "briefcase",
                MicrocreditLoanType.CreditAppui => "hand-helping",
                MicrocreditLoanType.CreditHypothecaire => "building",
                _ => "help-circle"
            };
        }

        /// <summary>
        /// Obtenir la couleur recommandée pour un type de crédit
        /// </summary>
        public static string GetLoanTypeColor(MicrocreditLoanType loanType)
        {
            return loanType switch
            {
                MicrocreditLoanType.Commercial => "#3B82F6", // Blue
                MicrocreditLoanType.Agricultural => "#10B981", // Green
                MicrocreditLoanType.Personal => "#8B5CF6", // Purple
                MicrocreditLoanType.Emergency => "#EF4444", // Red
                MicrocreditLoanType.CreditLoyer => "#F59E0B", // Amber
                MicrocreditLoanType.CreditAuto => "#06B6D4", // Cyan
                MicrocreditLoanType.CreditMoto => "#14B8A6", // Teal
                MicrocreditLoanType.CreditPersonnel => "#A855F7", // Purple (variant)
                MicrocreditLoanType.CreditScolaire => "#6366F1", // Indigo
                MicrocreditLoanType.CreditAgricole => "#22C55E", // Green (variant)
                MicrocreditLoanType.CreditProfessionnel => "#0EA5E9", // Sky
                MicrocreditLoanType.CreditAppui => "#F97316", // Orange
                MicrocreditLoanType.CreditHypothecaire => "#EC4899", // Pink
                _ => "#6B7280" // Gray
            };
        }

        /// <summary>
        /// Vérifier si un type de crédit nécessite une garantie
        /// </summary>
        public static bool RequiresCollateral(MicrocreditLoanType loanType)
        {
            return loanType switch
            {
                MicrocreditLoanType.CreditAuto => true,
                MicrocreditLoanType.CreditMoto => true,
                MicrocreditLoanType.CreditHypothecaire => true,
                MicrocreditLoanType.CreditProfessionnel => true,
                _ => false
            };
        }

        /// <summary>
        /// Obtenir tous les types de crédit disponibles
        /// </summary>
        public static List<MicrocreditLoanTypeInfo> GetAllLoanTypes()
        {
            var types = Enum.GetValues<MicrocreditLoanType>();
            return types.Select(type => new MicrocreditLoanTypeInfo
            {
                Type = type,
                Name = GetLoanTypeName(type),
                Description = GetLoanTypeDescription(type),
                Icon = GetLoanTypeIcon(type),
                Color = GetLoanTypeColor(type),
                RequiresCollateral = RequiresCollateral(type)
            }).ToList();
        }
    }

    /// <summary>
    /// Information sur un type de crédit
    /// </summary>
    public class MicrocreditLoanTypeInfo
    {
        public MicrocreditLoanType Type { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public bool RequiresCollateral { get; set; }
    }
}
