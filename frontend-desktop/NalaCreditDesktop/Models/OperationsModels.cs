using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace NalaCreditDesktop.Models
{
    // Énumérations pour les opérations
    public enum DeviseType
    {
        HTG,
        USD
    }

    public enum TransactionType
    {
        Depot,
        Retrait,
        Change,
        Consultation,
        Cloture
    }

    public enum StatutTransaction
    {
        EnCours,
        Validee,
        Annulee,
        EnAttente
    }

    // Modèle de base pour toutes les opérations
    public abstract class OperationBase
    {
        public string NumeroOperation { get; set; } = Guid.NewGuid().ToString("N")[..8].ToUpper();
        public DateTime DateOperation { get; set; } = DateTime.Now;
        public string NumeroCaisse { get; set; } = "CS-001";
        public string Caissier { get; set; } = "Marie Dupont";
        public StatutTransaction Statut { get; set; } = StatutTransaction.EnCours;
        public string Commentaires { get; set; } = string.Empty;
    }

    // Modèle pour les clients
    public class ClientModel
    {
        [Required(ErrorMessage = "Le numéro de compte est requis")]
        public string NumeroCompte { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Le nom est requis")]
        public string Nom { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Le prénom est requis")]
        public string Prenom { get; set; } = string.Empty;
        
        public string Telephone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Adresse { get; set; } = string.Empty;
        public DateTime DateNaissance { get; set; }
        public string NumeroIdentite { get; set; } = string.Empty;
        public decimal SoldeHTG { get; set; }
        public decimal SoldeUSD { get; set; }
        public DateTime DerniereActivite { get; set; } = DateTime.Now;
        public ObservableCollection<TransactionHistorique> Historique { get; set; } = new();

        public string NomComplet => $"{Prenom} {Nom}";
    }

    // Modèle pour l'historique des transactions
    public class TransactionHistorique
    {
        public string NumeroTransaction { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public TransactionType Type { get; set; }
        public DeviseType Devise { get; set; }
        public decimal Montant { get; set; }
        public decimal SoldeApres { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Caissier { get; set; } = string.Empty;
    }

    // Modèle pour les dépôts
    public class DepotModel : OperationBase
    {
        [Required(ErrorMessage = "Le numéro de compte est requis")]
        public string NumeroCompte { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Le montant est requis")]
        [Range(0.01, double.MaxValue, ErrorMessage = "Le montant doit être positif")]
        public decimal Montant { get; set; }
        
        [Required]
        public DeviseType Devise { get; set; } = DeviseType.HTG;
        
        public decimal TauxConversion { get; set; } = 1;
        public decimal MontantConverti { get; set; }
        public DeviseType DeviseCompte { get; set; } = DeviseType.HTG;
        public string SourceFonds { get; set; } = string.Empty;
        public bool ReçuImprime { get; set; } = false;
        public ClientModel? Client { get; set; }
    }

    // Modèle pour les retraits
    public class RetraitModel : OperationBase
    {
        [Required(ErrorMessage = "Le numéro de compte est requis")]
        public string NumeroCompte { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Le montant est requis")]
        [Range(0.01, double.MaxValue, ErrorMessage = "Le montant doit être positif")]
        public decimal Montant { get; set; }
        
        [Required]
        public DeviseType Devise { get; set; } = DeviseType.HTG;
        
        public decimal SoldeDisponible { get; set; }
        public decimal LimiteRetrait { get; set; } = 50000; // HTG
        public bool SignatureRequise { get; set; } = false;
        public bool AutorisationSuperviseur { get; set; } = false;
        public string MotifRetrait { get; set; } = string.Empty;
        public bool ReçuImprime { get; set; } = false;
        public ClientModel? Client { get; set; }
        
        public bool VerificationSolde => SoldeDisponible >= Montant;
        public bool RespecteLimite => Montant <= LimiteRetrait;
    }

    // Modèle pour les opérations de change
    public class ChangeModel : OperationBase
    {
        [Required(ErrorMessage = "Le numéro d'identité est requis")]
        public string NumeroIdentite { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Le nom du client est requis")]
        public string NomClient { get; set; } = string.Empty;
        
        [Required]
        public DeviseType DeviseSource { get; set; } = DeviseType.HTG;
        
        [Required]
        public DeviseType DeviseDestination { get; set; } = DeviseType.USD;
        
        [Required(ErrorMessage = "Le montant est requis")]
        [Range(0.01, double.MaxValue, ErrorMessage = "Le montant doit être positif")]
        public decimal MontantSource { get; set; }
        
        public decimal MontantDestination { get; set; }
        public decimal TauxAcheteur { get; set; } = 128.50m; // HTG pour 1 USD
        public decimal TauxVendeur { get; set; } = 131.50m; // HTG pour 1 USD
        public decimal TauxApplique { get; set; }
        public decimal LimiteJournaliere { get; set; } = 5000; // USD
        public decimal TotalChangeJour { get; set; } = 0;
        public string TypePiece { get; set; } = string.Empty; // Passeport, CIN, etc.
        public bool JustificatifValide { get; set; } = false;
        
        public bool RespecteLimite => (TotalChangeJour + MontantDestination) <= LimiteJournaliere;
    }

    // Modèle pour la consultation de compte
    public class ConsultationModel : OperationBase
    {
        public string TermeRecherche { get; set; } = string.Empty;
        public TypeRecherche TypeRecherche { get; set; } = TypeRecherche.NumeroCompte;
        public ClientModel? ClientTrouve { get; set; }
        public ObservableCollection<TransactionHistorique> DernieresTransactions { get; set; } = new();
        public ObservableCollection<ChangeModel> HistoriqueChange { get; set; } = new();
        public bool ImprimerReleve { get; set; } = false;
    }

    public enum TypeRecherche
    {
        NumeroCompte,
        Nom,
        Telephone
    }

    // Modèle pour la clôture de caisse
    public class ClotureModel : OperationBase
    {
        public DateTime HeureDebut { get; set; }
        public DateTime HeureFin { get; set; } = DateTime.Now;
        
        // Fonds théoriques
        public decimal SoldeOuvertureHTG { get; set; } = 100000;
        public decimal SoldeOuvertureUSD { get; set; } = 1000;
        public decimal TotalDepotsHTG { get; set; }
        public decimal TotalDepotsUSD { get; set; }
        public decimal TotalRetraitsHTG { get; set; }
        public decimal TotalRetraitsUSD { get; set; }
        public decimal TotalChangeHTG { get; set; }
        public decimal TotalChangeUSD { get; set; }
        
        // Fonds réels comptés
        public decimal FondsReelsHTG { get; set; }
        public decimal FondsReelsUSD { get; set; }
        
        // Calculs automatiques
        public decimal FondsTheoriquesHTG => SoldeOuvertureHTG + TotalDepotsHTG - TotalRetraitsHTG + TotalChangeHTG;
        public decimal FondsTheoriquesUSD => SoldeOuvertureUSD + TotalDepotsUSD - TotalRetraitsUSD + TotalChangeUSD;
        public decimal EcartHTG => FondsReelsHTG - FondsTheoriquesHTG;
        public decimal EcartUSD => FondsReelsUSD - FondsTheoriquesUSD;
        
        // Validation
        public bool ValidationCaissier { get; set; } = false;
        public bool ValidationSuperviseur { get; set; } = false;
        public string SuperviseurNom { get; set; } = string.Empty;
        public string MotifEcart { get; set; } = string.Empty;
        
        // Statistiques de la journée
        public int NombreTransactions { get; set; }
        public decimal TotalCommissions { get; set; }
        public ObservableCollection<TransactionHistorique> TransactionsDuJour { get; set; } = new();
        
        public bool PeutCloturer => ValidationCaissier && (Math.Abs(EcartHTG) <= 100 && Math.Abs(EcartUSD) <= 5 || ValidationSuperviseur);
    }

    // Modèle pour les rapports
    public class RapportJournalierModel
    {
        public DateTime DateRapport { get; set; } = DateTime.Today;
        public string NumeroCaisse { get; set; } = "CS-001";
        public string NomCaissier { get; set; } = "Marie Dupont";
        
        // Résumé des opérations
        public int NombreDepots { get; set; }
        public int NombreRetraits { get; set; }
        public int NombreChanges { get; set; }
        public int NombreConsultations { get; set; }
        
        // Montants par devise
        public decimal TotalDepotsHTG { get; set; }
        public decimal TotalDepotsUSD { get; set; }
        public decimal TotalRetraitsHTG { get; set; }
        public decimal TotalRetraitsUSD { get; set; }
        public decimal TotalChangeHTG { get; set; }
        public decimal TotalChangeUSD { get; set; }
        
        // Commissions et frais
        public decimal CommissionDepots { get; set; }
        public decimal CommissionRetraits { get; set; }
        public decimal CommissionChanges { get; set; }
        public decimal TotalCommissions => CommissionDepots + CommissionRetraits + CommissionChanges;
        
        // Informations de clôture
        public ClotureModel? Cloture { get; set; }
        
        // Signature électronique
        public string SignatureElectronique { get; set; } = string.Empty;
        public DateTime HeureSignature { get; set; }
        
        // Liste détaillée des transactions
        public ObservableCollection<TransactionHistorique> DetailTransactions { get; set; } = new();
    }

    // Modèle pour les taux de change
    public class TauxChangeModel
    {
        public DeviseType DeviseBase { get; set; } = DeviseType.USD;
        public DeviseType DeviseCible { get; set; } = DeviseType.HTG;
        public decimal TauxAcheteur { get; set; } = 128.50m;
        public decimal TauxVendeur { get; set; } = 131.50m;
        public DateTime DerniereMiseAJour { get; set; } = DateTime.Now;
        public string Source { get; set; } = "Banque Centrale";
        
        public decimal CalculerMontant(decimal montant, bool estAchat)
        {
            return estAchat ? montant * TauxAcheteur : montant / TauxVendeur;
        }
    }

    // Modèle pour les alertes et limites
    public class LimitesModel
    {
        public decimal LimiteRetraitJournalier { get; set; } = 50000; // HTG
        public decimal LimiteChangeJournalier { get; set; } = 5000; // USD
        public decimal SeuilSignatureRetrait { get; set; } = 25000; // HTG
        public decimal ToleranceEcartCloture { get; set; } = 100; // HTG
        public int DelaiSessionInactivite { get; set; } = 30; // minutes
    }
}