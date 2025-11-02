namespace NalaCreditDesktop.Models
{
    public class CompteClient
    {
        public string NumeroCompte { get; set; } = string.Empty;
        public string NomClient { get; set; } = string.Empty;
        public string Telephone { get; set; } = string.Empty;
        public decimal SoldeHTG { get; set; }
        public decimal SoldeUSD { get; set; }
        public string Statut { get; set; } = "Actif";
        public DateTime DateCreation { get; set; }
        public DateTime? DerniereTransaction { get; set; }
    }
}
