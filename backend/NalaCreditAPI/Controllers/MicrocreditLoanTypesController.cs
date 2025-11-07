using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.Helpers;
using NalaCreditAPI.Models;
using System.ComponentModel.DataAnnotations;

namespace NalaCreditAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MicrocreditLoanTypesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<MicrocreditLoanTypesController> _logger;

        public MicrocreditLoanTypesController(
            ApplicationDbContext context,
            ILogger<MicrocreditLoanTypesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Obtenir tous les types de crédit disponibles avec leurs métadonnées
        /// </summary>
        [HttpGet]
        public ActionResult<List<MicrocreditLoanTypeInfo>> GetAllLoanTypes()
        {
            try
            {
                var loanTypes = MicrocreditLoanTypeHelper.GetAllLoanTypes();
                return Ok(loanTypes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving loan types");
                return StatusCode(500, "An error occurred while retrieving loan types");
            }
        }

        /// <summary>
        /// Obtenir les configurations pour tous les types de crédit
        /// </summary>
        [HttpGet("configurations")]
        public async Task<ActionResult<List<MicrocreditLoanTypeConfigurationDto>>> GetConfigurations()
        {
            try
            {
                var configurations = await _context.MicrocreditLoanTypeConfigurations
                    .Where(c => c.IsActive)
                    .OrderBy(c => c.Type)
                    .ToListAsync();

                var result = configurations.Select(c => new MicrocreditLoanTypeConfigurationDto
                {
                    Id = c.Id,
                    Type = c.Type,
                    TypeName = MicrocreditLoanTypeHelper.GetLoanTypeName(c.Type),
                    Name = c.Name,
                    Description = c.Description,
                    MinAmount = c.MinAmount,
                    MaxAmount = c.MaxAmount,
                    MinDurationMonths = c.MinDurationMonths,
                    MaxDurationMonths = c.MaxDurationMonths,
                    InterestRateMin = c.InterestRateMin,
                    InterestRateMax = c.InterestRateMax,
                    DefaultInterestRate = c.DefaultInterestRate,
                    GracePeriodDays = c.GracePeriodDays,
                    PenaltyRate = c.PenaltyRate,
                    ProcessingFeeRate = c.ProcessingFeeRate,
                    IsActive = c.IsActive,
                    Icon = MicrocreditLoanTypeHelper.GetLoanTypeIcon(c.Type),
                    Color = MicrocreditLoanTypeHelper.GetLoanTypeColor(c.Type),
                    RequiresCollateral = MicrocreditLoanTypeHelper.RequiresCollateral(c.Type)
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving loan type configurations");
                return StatusCode(500, "An error occurred while retrieving loan type configurations");
            }
        }

        /// <summary>
        /// Obtenir la configuration pour un type de crédit spécifique
        /// </summary>
        [HttpGet("configurations/{loanType}")]
        public async Task<ActionResult<MicrocreditLoanTypeConfigurationDto>> GetConfiguration(MicrocreditLoanType loanType)
        {
            try
            {
                var configuration = await _context.MicrocreditLoanTypeConfigurations
                    .FirstOrDefaultAsync(c => c.Type == loanType && c.IsActive);

                if (configuration == null)
                {
                    return NotFound($"Configuration for loan type {loanType} not found");
                }

                var result = new MicrocreditLoanTypeConfigurationDto
                {
                    Id = configuration.Id,
                    Type = configuration.Type,
                    TypeName = MicrocreditLoanTypeHelper.GetLoanTypeName(configuration.Type),
                    Name = configuration.Name,
                    Description = configuration.Description,
                    MinAmount = configuration.MinAmount,
                    MaxAmount = configuration.MaxAmount,
                    MinDurationMonths = configuration.MinDurationMonths,
                    MaxDurationMonths = configuration.MaxDurationMonths,
                    InterestRateMin = configuration.InterestRateMin,
                    InterestRateMax = configuration.InterestRateMax,
                    DefaultInterestRate = configuration.DefaultInterestRate,
                    GracePeriodDays = configuration.GracePeriodDays,
                    PenaltyRate = configuration.PenaltyRate,
                    ProcessingFeeRate = configuration.ProcessingFeeRate,
                    IsActive = configuration.IsActive,
                    Icon = MicrocreditLoanTypeHelper.GetLoanTypeIcon(configuration.Type),
                    Color = MicrocreditLoanTypeHelper.GetLoanTypeColor(configuration.Type),
                    RequiresCollateral = MicrocreditLoanTypeHelper.RequiresCollateral(configuration.Type)
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving loan type configuration for {LoanType}", loanType);
                return StatusCode(500, "An error occurred while retrieving loan type configuration");
            }
        }

        /// <summary>
        /// Créer ou mettre à jour une configuration de type de crédit (Admin seulement)
        /// </summary>
        [HttpPost("configurations")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        public async Task<ActionResult<MicrocreditLoanTypeConfigurationDto>> CreateOrUpdateConfiguration(
            [FromBody] CreateMicrocreditLoanTypeConfigurationDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var existingConfig = await _context.MicrocreditLoanTypeConfigurations
                    .FirstOrDefaultAsync(c => c.Type == dto.Type);

                MicrocreditLoanTypeConfiguration configuration;

                if (existingConfig != null)
                {
                    // Mise à jour
                    existingConfig.Name = dto.Name;
                    existingConfig.Description = dto.Description;
                    existingConfig.MinAmount = dto.MinAmount;
                    existingConfig.MaxAmount = dto.MaxAmount;
                    existingConfig.MinDurationMonths = dto.MinDurationMonths;
                    existingConfig.MaxDurationMonths = dto.MaxDurationMonths;
                    existingConfig.InterestRateMin = dto.InterestRateMin;
                    existingConfig.InterestRateMax = dto.InterestRateMax;
                    existingConfig.DefaultInterestRate = dto.DefaultInterestRate;
                    existingConfig.GracePeriodDays = dto.GracePeriodDays;
                    existingConfig.PenaltyRate = dto.PenaltyRate;
                    existingConfig.ProcessingFeeRate = dto.ProcessingFeeRate;
                    existingConfig.IsActive = dto.IsActive;
                    existingConfig.UpdatedAt = DateTime.UtcNow;

                    configuration = existingConfig;
                }
                else
                {
                    // Création
                    configuration = new MicrocreditLoanTypeConfiguration
                    {
                        Id = Guid.NewGuid(),
                        Type = dto.Type,
                        Name = dto.Name,
                        Description = dto.Description,
                        MinAmount = dto.MinAmount,
                        MaxAmount = dto.MaxAmount,
                        MinDurationMonths = dto.MinDurationMonths,
                        MaxDurationMonths = dto.MaxDurationMonths,
                        InterestRateMin = dto.InterestRateMin,
                        InterestRateMax = dto.InterestRateMax,
                        DefaultInterestRate = dto.DefaultInterestRate,
                        GracePeriodDays = dto.GracePeriodDays,
                        PenaltyRate = dto.PenaltyRate,
                        ProcessingFeeRate = dto.ProcessingFeeRate,
                        IsActive = dto.IsActive,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.MicrocreditLoanTypeConfigurations.Add(configuration);
                }

                await _context.SaveChangesAsync();

                var result = new MicrocreditLoanTypeConfigurationDto
                {
                    Id = configuration.Id,
                    Type = configuration.Type,
                    TypeName = MicrocreditLoanTypeHelper.GetLoanTypeName(configuration.Type),
                    Name = configuration.Name,
                    Description = configuration.Description,
                    MinAmount = configuration.MinAmount,
                    MaxAmount = configuration.MaxAmount,
                    MinDurationMonths = configuration.MinDurationMonths,
                    MaxDurationMonths = configuration.MaxDurationMonths,
                    InterestRateMin = configuration.InterestRateMin,
                    InterestRateMax = configuration.InterestRateMax,
                    DefaultInterestRate = configuration.DefaultInterestRate,
                    GracePeriodDays = configuration.GracePeriodDays,
                    PenaltyRate = configuration.PenaltyRate,
                    ProcessingFeeRate = configuration.ProcessingFeeRate,
                    IsActive = configuration.IsActive,
                    Icon = MicrocreditLoanTypeHelper.GetLoanTypeIcon(configuration.Type),
                    Color = MicrocreditLoanTypeHelper.GetLoanTypeColor(configuration.Type),
                    RequiresCollateral = MicrocreditLoanTypeHelper.RequiresCollateral(configuration.Type)
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating/updating loan type configuration");
                return StatusCode(500, "An error occurred while saving loan type configuration");
            }
        }
    }

    // DTOs pour les configurations
    public class MicrocreditLoanTypeConfigurationDto
    {
        public Guid Id { get; set; }
        public MicrocreditLoanType Type { get; set; }
        public string TypeName { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal MinAmount { get; set; }
        public decimal MaxAmount { get; set; }
        public int MinDurationMonths { get; set; }
        public int MaxDurationMonths { get; set; }
        public decimal InterestRateMin { get; set; }
        public decimal InterestRateMax { get; set; }
        public decimal DefaultInterestRate { get; set; }
        public int GracePeriodDays { get; set; }
        public decimal PenaltyRate { get; set; }
        public decimal ProcessingFeeRate { get; set; }
        public bool IsActive { get; set; }
        public string Icon { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public bool RequiresCollateral { get; set; }
    }

    public class CreateMicrocreditLoanTypeConfigurationDto
    {
        [Required]
        public MicrocreditLoanType Type { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal MinAmount { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal MaxAmount { get; set; }

        [Required]
        [Range(1, 600)]
        public int MinDurationMonths { get; set; }

        [Required]
        [Range(1, 600)]
        public int MaxDurationMonths { get; set; }

        [Required]
        [Range(0, 1)]
        public decimal InterestRateMin { get; set; }

        [Required]
        [Range(0, 1)]
        public decimal InterestRateMax { get; set; }

        [Required]
        [Range(0, 1)]
        public decimal DefaultInterestRate { get; set; }

        [Required]
        [Range(0, 365)]
        public int GracePeriodDays { get; set; }

        [Required]
        [Range(0, 1)]
        public decimal PenaltyRate { get; set; }

        [Required]
        [Range(0, 1)]
        public decimal ProcessingFeeRate { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
