using System.ComponentModel.DataAnnotations;

namespace NalaCreditAPI.DTOs
{
    public enum AdminTypeDto
    {
        CAISSIER = 0,
        SECRETAIRE_ADMINISTRATIF = 1,
        AGENT_DE_CREDIT = 2,
        CHEF_DE_SUCCURSALE = 3,
        DIRECTEUR_REGIONAL = 4,
        ADMINISTRATEUR_SYSTEME = 5,
        DIRECTION_GENERALE = 6,
        COMPTABLE_FINANCE = 7
    }

    public enum AdminLevelDto
    {
        Level3 = 3,
        Level4 = 4,
        Level5 = 5
    }

    public class AdminPermissionsDto
    {
        public bool CanCreateUsers { get; set; }
        public bool CanModifyUsers { get; set; }
        public bool CanDeleteUsers { get; set; }
        public bool CanViewFinancialData { get; set; }
        public bool CanModifyFinancialData { get; set; }
        public bool CanViewSystemLogs { get; set; }
        public bool CanModifySystemSettings { get; set; }
        public bool CanManageBranches { get; set; }
        public bool CanViewAllReports { get; set; }
        public bool CanValidateCredits { get; set; }
        public decimal? MaxCreditValidation { get; set; }
        public bool ReadOnlyAccess { get; set; }
        public bool CanManagePayroll { get; set; }
        public bool CanManageEmployees { get; set; }
        public bool CanProvideSupport { get; set; }
    }

    public class AdminDto
    {
        public string Id { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? Photo { get; set; }
        public AdminTypeDto AdminType { get; set; }
        public AdminLevelDto AdminLevel { get; set; }
        public AdminPermissionsDto Permissions { get; set; } = new AdminPermissionsDto();
        public string Department { get; set; } = string.Empty;
        public DateTime HireDate { get; set; }
        public bool IsActive { get; set; }
        public List<string> AssignedBranches { get; set; } = new List<string>();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime? LastLogin { get; set; }
    }

    public class AdminCreateDto
    {
        [Required(ErrorMessage = "Le prénom est requis")]
        [StringLength(50, MinimumLength = 2, ErrorMessage = "Le prénom doit contenir entre 2 et 50 caractères")]
        public string FirstName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Le nom est requis")]
        [StringLength(50, MinimumLength = 2, ErrorMessage = "Le nom doit contenir entre 2 et 50 caractères")]
        public string LastName { get; set; } = string.Empty;

        [Required(ErrorMessage = "L'email est requis")]
        [EmailAddress(ErrorMessage = "Format d'email invalide")]
        [StringLength(100, ErrorMessage = "L'email ne peut pas dépasser 100 caractères")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Le téléphone est requis")]
        [RegularExpression(@"^(\+509|509)?[0-9]{8}$", ErrorMessage = "Format de téléphone invalide")]
        public string Phone { get; set; } = string.Empty;

        public string? Photo { get; set; }

        [Required(ErrorMessage = "Le type d'administrateur est requis")]
        public AdminTypeDto AdminType { get; set; }

        [Required(ErrorMessage = "Le département est requis")]
        [StringLength(100, ErrorMessage = "Le département ne peut pas dépasser 100 caractères")]
        public string Department { get; set; } = string.Empty;

        [Required(ErrorMessage = "La date d'embauche est requise")]
        public DateTime HireDate { get; set; }

        [Required(ErrorMessage = "Au moins une succursale doit être assignée")]
        [MinLength(1, ErrorMessage = "Au moins une succursale doit être assignée")]
        public List<string> AssignedBranches { get; set; } = new List<string>();

        [Required(ErrorMessage = "Le mot de passe est requis")]
        [StringLength(100, MinimumLength = 8, ErrorMessage = "Le mot de passe doit contenir au moins 8 caractères")]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$", 
            ErrorMessage = "Le mot de passe doit contenir au moins: 1 minuscule, 1 majuscule, 1 chiffre, 1 caractère spécial")]
        public string Password { get; set; } = string.Empty;
    }

    public class AdminUpdateDto
    {
        [Required(ErrorMessage = "Le prénom est requis")]
        [StringLength(50, MinimumLength = 2, ErrorMessage = "Le prénom doit contenir entre 2 et 50 caractères")]
        public string FirstName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Le nom est requis")]
        [StringLength(50, MinimumLength = 2, ErrorMessage = "Le nom doit contenir entre 2 et 50 caractères")]
        public string LastName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Le téléphone est requis")]
        [RegularExpression(@"^(\+509|509)?[0-9]{8}$", ErrorMessage = "Format de téléphone invalide")]
        public string Phone { get; set; } = string.Empty;

        public string? Photo { get; set; }

        [Required(ErrorMessage = "Le type d'administrateur est requis")]
        public AdminTypeDto AdminType { get; set; }

        [Required(ErrorMessage = "Le département est requis")]
        [StringLength(100, ErrorMessage = "Le département ne peut pas dépasser 100 caractères")]
        public string Department { get; set; } = string.Empty;

        [Required(ErrorMessage = "La date d'embauche est requise")]
        public DateTime HireDate { get; set; }

        [Required(ErrorMessage = "Au moins une succursale doit être assignée")]
        [MinLength(1, ErrorMessage = "Au moins une succursale doit être assignée")]
        public List<string> AssignedBranches { get; set; } = new List<string>();

        // Mot de passe optionnel pour la mise à jour (validation uniquement si fourni)
        public string? Password { get; set; }
    }

    public class AdminStatisticsDto
    {
        public int TotalAdmins { get; set; }
        public int ActiveAdmins { get; set; }
        public Dictionary<AdminTypeDto, int> AdminsByType { get; set; } = new Dictionary<AdminTypeDto, int>();
        public Dictionary<string, int> AdminsByDepartment { get; set; } = new Dictionary<string, int>();
        public int RecentLogins { get; set; } // Nombre de connexions dans les 30 derniers jours
    }

    public class AdminFiltersDto
    {
        public string? Search { get; set; }
        public AdminTypeDto? AdminType { get; set; }
        public string? Department { get; set; }
        public bool? IsActive { get; set; }
        public string? AssignedBranch { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class AdminListResponseDto
    {
        public List<AdminDto> Admins { get; set; } = new List<AdminDto>();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public AdminStatisticsDto Statistics { get; set; } = new AdminStatisticsDto();
    }

    public class PasswordChangeDto
    {
        [Required(ErrorMessage = "Le mot de passe actuel est requis")]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Le nouveau mot de passe est requis")]
        [StringLength(100, MinimumLength = 8, ErrorMessage = "Le mot de passe doit contenir au moins 8 caractères")]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$", 
            ErrorMessage = "Le mot de passe doit contenir au moins: 1 minuscule, 1 majuscule, 1 chiffre, 1 caractère spécial")]
        public string NewPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Confirmer le nouveau mot de passe")]
        [Compare("NewPassword", ErrorMessage = "Les mots de passe ne correspondent pas")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}

namespace NalaCreditAPI.Helpers
{
    using NalaCreditAPI.DTOs;
    
    public static class AdminPermissionsHelper
    {
        private static readonly Dictionary<AdminTypeDto, AdminPermissionsDto> _permissions = new()
        {
            [AdminTypeDto.DIRECTION_GENERALE] = new AdminPermissionsDto
            {
                CanCreateUsers = true,
                CanModifyUsers = true,
                CanDeleteUsers = true,
                CanViewFinancialData = true,
                CanModifyFinancialData = true,
                CanViewSystemLogs = true,
                CanModifySystemSettings = true,
                CanManageBranches = true,
                CanViewAllReports = true,
                CanValidateCredits = true,
                ReadOnlyAccess = false,
                CanManagePayroll = true,
                CanManageEmployees = true,
                CanProvideSupport = true
            },
            [AdminTypeDto.ADMINISTRATEUR_SYSTEME] = new AdminPermissionsDto
            {
                CanCreateUsers = true,
                CanModifyUsers = true,
                CanDeleteUsers = false,
                CanViewFinancialData = false,
                CanModifyFinancialData = false,
                CanViewSystemLogs = true,
                CanModifySystemSettings = true,
                CanManageBranches = true,
                CanViewAllReports = false,
                CanValidateCredits = false,
                ReadOnlyAccess = false,
                CanManagePayroll = false,
                CanManageEmployees = true,
                CanProvideSupport = true
            },
            [AdminTypeDto.COMPTABLE_FINANCE] = new AdminPermissionsDto
            {
                CanCreateUsers = false,
                CanModifyUsers = false,
                CanDeleteUsers = false,
                CanViewFinancialData = true,
                CanModifyFinancialData = true,
                CanViewSystemLogs = false,
                CanModifySystemSettings = false,
                CanManageBranches = false,
                CanViewAllReports = true,
                CanValidateCredits = true,
                MaxCreditValidation = 100000,
                ReadOnlyAccess = false,
                CanManagePayroll = true,
                CanManageEmployees = false,
                CanProvideSupport = false
            },
            [AdminTypeDto.DIRECTEUR_REGIONAL] = new AdminPermissionsDto
            {
                CanCreateUsers = false,
                CanModifyUsers = true,
                CanDeleteUsers = false,
                CanViewFinancialData = true,
                CanModifyFinancialData = false,
                CanViewSystemLogs = false,
                CanModifySystemSettings = false,
                CanManageBranches = false,
                CanViewAllReports = true,
                CanValidateCredits = true,
                MaxCreditValidation = 50000,
                ReadOnlyAccess = false,
                CanManagePayroll = false,
                CanManageEmployees = true,
                CanProvideSupport = false
            },
            [AdminTypeDto.CHEF_DE_SUCCURSALE] = new AdminPermissionsDto
            {
                CanCreateUsers = false,
                CanModifyUsers = false,
                CanDeleteUsers = false,
                CanViewFinancialData = true,
                CanModifyFinancialData = false,
                CanViewSystemLogs = false,
                CanModifySystemSettings = false,
                CanManageBranches = false,
                CanViewAllReports = true,
                CanValidateCredits = true,
                MaxCreditValidation = 25000,
                ReadOnlyAccess = false,
                CanManagePayroll = false,
                CanManageEmployees = true,
                CanProvideSupport = false
            },
            [AdminTypeDto.AGENT_DE_CREDIT] = new AdminPermissionsDto
            {
                CanCreateUsers = false,
                CanModifyUsers = false,
                CanDeleteUsers = false,
                CanViewFinancialData = false,
                CanModifyFinancialData = false,
                CanViewSystemLogs = false,
                CanModifySystemSettings = false,
                CanManageBranches = false,
                CanViewAllReports = false,
                CanValidateCredits = true,
                MaxCreditValidation = 10000,
                ReadOnlyAccess = false,
                CanManagePayroll = false,
                CanManageEmployees = false,
                CanProvideSupport = false
            },
            [AdminTypeDto.CAISSIER] = new AdminPermissionsDto
            {
                CanCreateUsers = false,
                CanModifyUsers = false,
                CanDeleteUsers = false,
                CanViewFinancialData = false,
                CanModifyFinancialData = false,
                CanViewSystemLogs = false,
                CanModifySystemSettings = false,
                CanManageBranches = false,
                CanViewAllReports = false,
                CanValidateCredits = false,
                ReadOnlyAccess = false,
                CanManagePayroll = false,
                CanManageEmployees = false,
                CanProvideSupport = false
            },
            [AdminTypeDto.SECRETAIRE_ADMINISTRATIF] = new AdminPermissionsDto
            {
                CanCreateUsers = false,
                CanModifyUsers = false,
                CanDeleteUsers = false,
                CanViewFinancialData = false,
                CanModifyFinancialData = false,
                CanViewSystemLogs = false,
                CanModifySystemSettings = false,
                CanManageBranches = false,
                CanViewAllReports = false,
                CanValidateCredits = false,
                ReadOnlyAccess = false,
                CanManagePayroll = false,
                CanManageEmployees = false,
                CanProvideSupport = true
            }
        };

        public static AdminPermissionsDto GetPermissionsForType(AdminTypeDto adminType)
        {
            return _permissions.TryGetValue(adminType, out var permissions) ? permissions : new AdminPermissionsDto();
        }

        public static AdminLevelDto GetLevelForType(AdminTypeDto adminType)
        {
            return adminType switch
            {
                AdminTypeDto.DIRECTION_GENERALE => AdminLevelDto.Level5,
                AdminTypeDto.ADMINISTRATEUR_SYSTEME => AdminLevelDto.Level5,
                AdminTypeDto.DIRECTEUR_REGIONAL => AdminLevelDto.Level4,
                AdminTypeDto.COMPTABLE_FINANCE => AdminLevelDto.Level4,
                AdminTypeDto.CHEF_DE_SUCCURSALE => AdminLevelDto.Level4,
                AdminTypeDto.AGENT_DE_CREDIT => AdminLevelDto.Level3,
                AdminTypeDto.CAISSIER => AdminLevelDto.Level3,
                AdminTypeDto.SECRETAIRE_ADMINISTRATIF => AdminLevelDto.Level3,
                _ => AdminLevelDto.Level3
            };
        }
    }
}