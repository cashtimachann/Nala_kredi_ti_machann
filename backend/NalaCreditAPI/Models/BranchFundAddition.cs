using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalaCreditAPI.Models;

/// <summary>
/// Représente un ajout de fonds à une succursale par le SuperAdmin
/// </summary>
public class BranchFundAddition
{
    public int Id { get; set; }

    [Required]
    public int BranchId { get; set; }
    public Branch Branch { get; set; } = null!;

    [Required]
    public string AddedBy { get; set; } = string.Empty; // SuperAdmin UserId
    public User AddedByUser { get; set; } = null!;

    [Column(TypeName = "decimal(18,2)")]
    public decimal AmountHTG { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal AmountUSD { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Indique si les fonds ont été utilisés (alloués à une session de caisse)
    /// </summary>
    public bool IsAllocated { get; set; } = false;

    public DateTime? AllocatedAt { get; set; }
}
