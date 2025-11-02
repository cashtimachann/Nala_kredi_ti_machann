using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Helpers;
using NalaCreditAPI.Models;
using System.Security.Claims;

// Alias pour simplifier le code
using ApplicationUser = NalaCreditAPI.Models.User;

namespace NalaCreditAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<AdminController> _logger;

        public AdminController(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager,
            ILogger<AdminController> logger)
        {
            _context = context;
            _userManager = userManager;
            _logger = logger;
        }

        // GET: api/admin
        [HttpGet]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<ActionResult<AdminListResponseDto>> GetAdmins([FromQuery] AdminFiltersDto filters)
        {
            try
            {
                // Get all users (all roles are administrative users)
                var query = _context.Users.AsQueryable();

                // Apply filters
                if (!string.IsNullOrEmpty(filters.Search))
                {
                    query = query.Where(u => 
                        u.FirstName.Contains(filters.Search) ||
                        u.LastName.Contains(filters.Search) ||
                        u.Email.Contains(filters.Search));
                }

                if (filters.AdminType.HasValue)
                {
                    var userRole = MapAdminTypeToUserRole(filters.AdminType.Value);
                    query = query.Where(u => u.Role == userRole);
                }

                if (!string.IsNullOrEmpty(filters.Department))
                {
                    // Assuming we add a Department property to ApplicationUser
                    // query = query.Where(u => u.Department == filters.Department);
                }

                if (filters.IsActive.HasValue)
                {
                    query = query.Where(u => u.IsActive == filters.IsActive.Value);
                }

                if (!string.IsNullOrEmpty(filters.AssignedBranch))
                {
                    query = query.Where(u => u.BranchId.HasValue && u.BranchId.ToString() == filters.AssignedBranch);
                }

                var totalCount = await query.CountAsync();

                var admins = await query
                    .Include(u => u.Branch)
                    .OrderByDescending(u => u.CreatedAt)
                    .Skip((filters.Page - 1) * filters.PageSize)
                    .Take(filters.PageSize)
                    .Select(u => new AdminDto
                    {
                        Id = u.Id,
                        FirstName = u.FirstName ?? string.Empty,
                        LastName = u.LastName ?? string.Empty,
                        FullName = $"{u.FirstName} {u.LastName}",
                        Email = u.Email ?? string.Empty,
                        Phone = u.PhoneNumber ?? string.Empty,
                        // ⭐ Use saved AdminType, fallback to mapping if null (old data)
                        AdminType = u.AdminType.HasValue 
                            ? (AdminTypeDto)u.AdminType.Value 
                            : MapUserRoleToAdminType(u.Role),
                        AdminLevel = AdminPermissionsHelper.GetLevelForType(
                            u.AdminType.HasValue 
                                ? (AdminTypeDto)u.AdminType.Value 
                                : MapUserRoleToAdminType(u.Role)),
                        Permissions = AdminPermissionsHelper.GetPermissionsForType(
                            u.AdminType.HasValue 
                                ? (AdminTypeDto)u.AdminType.Value 
                                : MapUserRoleToAdminType(u.Role)),
                        Department = u.Department ?? "Direction Générale",
                        HireDate = u.CreatedAt,
                        IsActive = u.IsActive,
                        AssignedBranches = u.Branch != null ? new List<string> { u.Branch.Name } : new List<string>(),
                        CreatedAt = u.CreatedAt,
                        UpdatedAt = u.CreatedAt,
                        CreatedBy = "system",
                        LastLogin = u.LastLogin
                    })
                    .ToListAsync();

                var statistics = await GetAdminStatistics();

                return Ok(new AdminListResponseDto
                {
                    Admins = admins,
                    TotalCount = totalCount,
                    Page = filters.Page,
                    PageSize = filters.PageSize,
                    TotalPages = (int)Math.Ceiling((double)totalCount / filters.PageSize),
                    Statistics = statistics
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching admins");
                return StatusCode(500, "Erreur interne du serveur");
            }
        }

        // GET: api/admin/{id}
        [HttpGet("{id}")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        public async Task<ActionResult<AdminDto>> GetAdmin(string id)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.Branch)
                    .FirstOrDefaultAsync(u => u.Id == id);

                if (user == null)
                {
                    return NotFound("Administrateur introuvable");
                }

                // Check if current user can view this admin
                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUser = await _userManager.FindByIdAsync(currentUserId!);
                
                if (currentUser?.Role != UserRole.SuperAdmin && currentUser?.Id != id)
                {
                    return Forbid("Accès non autorisé");
                }

                var adminDto = new AdminDto
                {
                    Id = user.Id,
                    FirstName = user.FirstName ?? string.Empty,
                    LastName = user.LastName ?? string.Empty,
                    FullName = $"{user.FirstName} {user.LastName}",
                    Email = user.Email ?? string.Empty,
                    Phone = user.PhoneNumber ?? string.Empty,
                    // ⭐ Use saved AdminType, fallback to mapping if null
                    AdminType = user.AdminType.HasValue 
                        ? (AdminTypeDto)user.AdminType.Value 
                        : MapUserRoleToAdminType(user.Role),
                    AdminLevel = AdminPermissionsHelper.GetLevelForType(
                        user.AdminType.HasValue 
                            ? (AdminTypeDto)user.AdminType.Value 
                            : MapUserRoleToAdminType(user.Role)),
                    Permissions = AdminPermissionsHelper.GetPermissionsForType(
                        user.AdminType.HasValue 
                            ? (AdminTypeDto)user.AdminType.Value 
                            : MapUserRoleToAdminType(user.Role)),
                    Department = user.Department ?? "Direction Générale",
                    HireDate = user.HireDate ?? user.CreatedAt,
                    IsActive = user.IsActive,
                    AssignedBranches = user.BranchId.HasValue ? new List<string> { user.BranchId.ToString()! } : new List<string>(),
                    CreatedAt = user.CreatedAt,
                    UpdatedAt = user.CreatedAt,
                    CreatedBy = "system",
                    LastLogin = user.LastLogin
                };

                return Ok(adminDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching admin {AdminId}", id);
                return StatusCode(500, "Erreur interne du serveur");
            }
        }

        // POST: api/admin
        [HttpPost]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<ActionResult<AdminDto>> CreateAdmin(AdminCreateDto createDto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Check if user with this email already exists
                var existingUser = await _userManager.FindByEmailAsync(createDto.Email);
                if (existingUser != null)
                {
                    return BadRequest("Un utilisateur avec cet email existe déjà");
                }

                // Validate that at least one branch is assigned
                if (!createDto.AssignedBranches.Any())
                {
                    return BadRequest("Au moins une succursale doit être assignée");
                }

                // Validate assigned branches for Regional Director
                if (createDto.AdminType == AdminTypeDto.DIRECTEUR_REGIONAL && !createDto.AssignedBranches.Any())
                {
                    return BadRequest("Au moins une succursale doit être assignée pour un Directeur Régional");
                }

                var user = new ApplicationUser
                {
                    UserName = createDto.Email,
                    Email = createDto.Email,
                    EmailConfirmed = true,
                    FirstName = createDto.FirstName,
                    LastName = createDto.LastName,
                    PhoneNumber = createDto.Phone,
                    Department = createDto.Department,
                    HireDate = DateTime.SpecifyKind(createDto.HireDate, DateTimeKind.Utc),
                    Role = MapAdminTypeToUserRole(createDto.AdminType),
                    AdminType = (int)createDto.AdminType,  // ⭐ SAVE AdminType!
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    BranchId = createDto.AssignedBranches.FirstOrDefault() != null 
                        ? int.TryParse(createDto.AssignedBranches.First(), out var branchId) ? branchId : null 
                        : null
                };

                var result = await _userManager.CreateAsync(user, createDto.Password);
                if (!result.Succeeded)
                {
                    return BadRequest(result.Errors);
                }

                // Add to appropriate role
                var roleName = GetRoleNameFromUserRole(user.Role);
                await _userManager.AddToRoleAsync(user, roleName);

                // Log the creation
                await LogAdminAction("CREATE", user.Id, $"Administrateur créé: {user.Email}");

                var adminDto = new AdminDto
                {
                    Id = user.Id,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    FullName = $"{user.FirstName} {user.LastName}",
                    Email = user.Email,
                    Phone = user.PhoneNumber ?? string.Empty,
                    AdminType = createDto.AdminType,
                    AdminLevel = AdminPermissionsHelper.GetLevelForType(createDto.AdminType),
                    Permissions = AdminPermissionsHelper.GetPermissionsForType(createDto.AdminType),
                    Department = createDto.Department,
                    HireDate = createDto.HireDate,
                    IsActive = true,
                    AssignedBranches = createDto.AssignedBranches,
                    CreatedAt = user.CreatedAt,
                    UpdatedAt = user.CreatedAt,
                    CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system"
                };

                return CreatedAtAction(nameof(GetAdmin), new { id = user.Id }, adminDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating admin");
                return StatusCode(500, "Erreur lors de la création de l'administrateur");
            }
        }

        // PUT: api/admin/{id}
        [HttpPut("{id}")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<ActionResult<AdminDto>> UpdateAdmin(string id, AdminUpdateDto updateDto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var user = await _userManager.FindByIdAsync(id);
                if (user == null)
                {
                    return NotFound("Administrateur introuvable");
                }

                // Validate that at least one branch is assigned
                if (!updateDto.AssignedBranches.Any())
                {
                    return BadRequest("Au moins une succursale doit être assignée");
                }

                // Prevent modification of SuperAdmin by non-SuperAdmin
                var currentUser = await GetCurrentUser();
                if (user.Role == UserRole.SuperAdmin && currentUser?.Role != UserRole.SuperAdmin)
                {
                    return Forbid("Impossible de modifier un Super Administrateur");
                }

                // Update user properties
                user.FirstName = updateDto.FirstName;
                user.LastName = updateDto.LastName;
                user.PhoneNumber = updateDto.Phone;
                user.Department = updateDto.Department;
                user.HireDate = DateTime.SpecifyKind(updateDto.HireDate, DateTimeKind.Utc);
                user.Role = MapAdminTypeToUserRole(updateDto.AdminType);
                user.AdminType = (int)updateDto.AdminType;  // ⭐ SAVE AdminType!
                user.BranchId = updateDto.AssignedBranches.FirstOrDefault() != null 
                    ? int.TryParse(updateDto.AssignedBranches.First(), out var branchId) ? branchId : null 
                    : null;

                // Update password if provided
                if (!string.IsNullOrEmpty(updateDto.Password))
                {
                    var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                    await _userManager.ResetPasswordAsync(user, token, updateDto.Password);
                }

                var result = await _userManager.UpdateAsync(user);
                if (!result.Succeeded)
                {
                    return BadRequest(result.Errors);
                }

                // Update roles
                var currentRoles = await _userManager.GetRolesAsync(user);
                await _userManager.RemoveFromRolesAsync(user, currentRoles);
                await _userManager.AddToRoleAsync(user, GetRoleNameFromUserRole(user.Role));

                // Log the update
                await LogAdminAction("UPDATE", user.Id, $"Administrateur modifié: {user.Email}");

                var adminDto = new AdminDto
                {
                    Id = user.Id,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    FullName = $"{user.FirstName} {user.LastName}",
                    Email = user.Email ?? string.Empty,
                    Phone = user.PhoneNumber ?? string.Empty,
                    AdminType = updateDto.AdminType,
                    AdminLevel = AdminPermissionsHelper.GetLevelForType(updateDto.AdminType),
                    Permissions = AdminPermissionsHelper.GetPermissionsForType(updateDto.AdminType),
                    Department = updateDto.Department,
                    HireDate = updateDto.HireDate,
                    IsActive = user.IsActive,
                    AssignedBranches = updateDto.AssignedBranches,
                    CreatedAt = user.CreatedAt,
                    UpdatedAt = DateTime.UtcNow,
                    CreatedBy = "system",
                    LastLogin = user.LastLogin
                };

                return Ok(adminDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating admin {AdminId}", id);
                return StatusCode(500, "Erreur lors de la mise à jour de l'administrateur");
            }
        }

        // PUT: api/admin/{id}/toggle-status
        [HttpPut("{id}/toggle-status")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<ActionResult> ToggleAdminStatus(string id)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(id);
                if (user == null)
                {
                    return NotFound("Administrateur introuvable");
                }

                // Prevent deactivating SuperAdmin
                if (user.Role == UserRole.SuperAdmin)
                {
                    return BadRequest("Impossible de désactiver un Super Administrateur");
                }

                user.IsActive = !user.IsActive;
                var result = await _userManager.UpdateAsync(user);
                
                if (!result.Succeeded)
                {
                    return BadRequest(result.Errors);
                }

                // Log the action
                await LogAdminAction("STATUS_CHANGE", user.Id, 
                    $"Statut administrateur changé: {user.Email} - {(user.IsActive ? "Activé" : "Désactivé")}");

                return Ok(new { IsActive = user.IsActive });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling admin status {AdminId}", id);
                return StatusCode(500, "Erreur lors du changement de statut");
            }
        }

        // DELETE: api/admin/{id}
        [HttpDelete("{id}")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<ActionResult> DeleteAdmin(string id)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(id);
                if (user == null)
                {
                    return NotFound("Administrateur introuvable");
                }

                // Prevent deletion of SuperAdmin
                if (user.Role == UserRole.SuperAdmin)
                {
                    return BadRequest("Impossible de supprimer un Super Administrateur");
                }

                // Check if admin has associated data
                // Add checks here for any related entities

                var result = await _userManager.DeleteAsync(user);
                if (!result.Succeeded)
                {
                    return BadRequest(result.Errors);
                }

                // Log the deletion
                await LogAdminAction("DELETE", user.Id, $"Administrateur supprimé: {user.Email}");

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting admin {AdminId}", id);
                return StatusCode(500, "Erreur lors de la suppression de l'administrateur");
            }
        }

        // POST: api/admin/{id}/change-password
        [HttpPost("{id}/change-password")]
        [Authorize]
        public async Task<ActionResult> ChangePassword(string id, PasswordChangeDto passwordDto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUser = await GetCurrentUser();

                // Only SuperAdmin can change other admins' passwords, or admin can change their own
                if (currentUserId != id && currentUser?.Role != UserRole.SuperAdmin)
                {
                    return Forbid("Accès non autorisé");
                }

                var user = await _userManager.FindByIdAsync(id);
                if (user == null)
                {
                    return NotFound("Administrateur introuvable");
                }

                // If changing own password, verify current password
                if (currentUserId == id)
                {
                    var isCurrentPasswordValid = await _userManager.CheckPasswordAsync(user, passwordDto.CurrentPassword);
                    if (!isCurrentPasswordValid)
                    {
                        return BadRequest("Mot de passe actuel incorrect");
                    }
                }

                var result = await _userManager.ChangePasswordAsync(user, passwordDto.CurrentPassword, passwordDto.NewPassword);
                if (!result.Succeeded)
                {
                    return BadRequest(result.Errors);
                }

                // Log the password change
                await LogAdminAction("PASSWORD_CHANGE", user.Id, $"Mot de passe changé pour: {user.Email}");

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing password for admin {AdminId}", id);
                return StatusCode(500, "Erreur lors du changement de mot de passe");
            }
        }

        // GET: api/admin/statistics
        [HttpGet("statistics")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<ActionResult<AdminStatisticsDto>> GetStatistics()
        {
            try
            {
                var statistics = await GetAdminStatistics();
                return Ok(statistics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching admin statistics");
                return StatusCode(500, "Erreur lors de la récupération des statistiques");
            }
        }

        #region Private Methods

        private async Task<AdminStatisticsDto> GetAdminStatistics()
        {
            var adminUsers = await _context.Users
                .Where(u => u.Role >= UserRole.SupportTechnique && u.Role <= UserRole.SuperAdmin)
                .ToListAsync();

            var totalAdmins = adminUsers.Count;
            var activeAdmins = adminUsers.Count(u => u.IsActive);
            var recentLogins = adminUsers.Count(u => u.LastLogin.HasValue && u.LastLogin > DateTime.UtcNow.AddDays(-30));

            var adminsByType = adminUsers.GroupBy(u => MapUserRoleToAdminType(u.Role))
                .ToDictionary(g => g.Key, g => g.Count());

            return new AdminStatisticsDto
            {
                TotalAdmins = totalAdmins,
                ActiveAdmins = activeAdmins,
                AdminsByType = adminsByType,
                AdminsByDepartment = new Dictionary<string, int>(), // Will be implemented when Department is added
                RecentLogins = recentLogins
            };
        }

        private async Task<ApplicationUser?> GetCurrentUser()
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return currentUserId != null ? await _userManager.FindByIdAsync(currentUserId) : null;
        }

        private async Task LogAdminAction(string action, string targetUserId, string description)
        {
            try
            {
                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
                var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();

                var auditLog = new AuditLog
                {
                    UserId = currentUserId,
                    Action = action,
                    EntityType = "Admin",
                    EntityId = targetUserId,
                    OldValues = "",
                    NewValues = description,
                    Timestamp = DateTime.UtcNow,
                    IpAddress = ipAddress,
                    UserAgent = userAgent
                };

                _context.AuditLogs.Add(auditLog);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error logging admin action");
            }
        }

        private static AdminTypeDto MapUserRoleToAdminType(UserRole role)
        {
            return role switch
            {
                UserRole.SuperAdmin => AdminTypeDto.DIRECTION_GENERALE,
                UserRole.Admin => AdminTypeDto.ADMINISTRATEUR_SYSTEME,
                UserRole.Manager => AdminTypeDto.DIRECTEUR_REGIONAL,
                UserRole.Cashier => AdminTypeDto.CAISSIER,
                UserRole.Employee => AdminTypeDto.AGENT_DE_CREDIT,
                UserRole.SupportTechnique => AdminTypeDto.SECRETAIRE_ADMINISTRATIF,
                _ => AdminTypeDto.CAISSIER
            };
        }

        private static UserRole MapAdminTypeToUserRole(AdminTypeDto adminType)
        {
            return adminType switch
            {
                AdminTypeDto.DIRECTION_GENERALE => UserRole.SuperAdmin,
                AdminTypeDto.ADMINISTRATEUR_SYSTEME => UserRole.Admin,
                AdminTypeDto.COMPTABLE_FINANCE => UserRole.Admin,
                AdminTypeDto.DIRECTEUR_REGIONAL => UserRole.Manager,
                AdminTypeDto.CHEF_DE_SUCCURSALE => UserRole.Manager,
                AdminTypeDto.AGENT_DE_CREDIT => UserRole.Employee,
                AdminTypeDto.CAISSIER => UserRole.Cashier,
                AdminTypeDto.SECRETAIRE_ADMINISTRATIF => UserRole.SupportTechnique,
                _ => UserRole.Employee
            };
        }

        private static string GetRoleNameFromUserRole(UserRole role)
        {
            return role switch
            {
                UserRole.SuperAdmin => "SuperAdmin",
                UserRole.Admin => "Admin",
                UserRole.Manager => "Manager",
                UserRole.Employee => "Employee",
                UserRole.Cashier => "Cashier",
                UserRole.SupportTechnique => "Support",
                _ => "Employee"
            };
        }

        #endregion
    }
}