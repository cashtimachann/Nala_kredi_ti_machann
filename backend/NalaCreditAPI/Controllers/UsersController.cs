using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Models;

namespace NalaCreditAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<User> _userManager;

        public UsersController(ApplicationDbContext context, UserManager<User> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        [HttpGet("available-managers")]
        public async Task<ActionResult<IEnumerable<UserInfoDto>>> GetAvailableManagers()
        {
            try
            {
                // Get users with roles that can be branch managers
                var users = await _context.Users
                    .Where(u => u.IsActive && 
                               (u.Role == UserRole.Manager || 
                                u.Role == UserRole.Admin ||
                                u.Role == UserRole.SuperAdmin))
                    .ToListAsync();

                var availableManagers = users.Select(u => new UserInfoDto
                {
                    Id = u.Id,
                    Email = u.Email!,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    Role = u.Role.ToString(),
                    BranchId = u.BranchId,
                    IsActive = u.IsActive,
                    LastLogin = u.LastLogin?.ToString("yyyy-MM-ddTHH:mm:ssZ")
                }).ToList();

                return Ok(availableManagers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors du chargement des managers disponibles", error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserInfoDto>>> GetAllUsers()
        {
            try
            {
                var userEntities = await _context.Users
                    .Where(u => u.IsActive)
                    .ToListAsync();

                var users = userEntities.Select(u => new UserInfoDto
                {
                    Id = u.Id,
                    Email = u.Email!,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    Role = u.Role.ToString(),
                    BranchId = u.BranchId,
                    IsActive = u.IsActive,
                    LastLogin = u.LastLogin?.ToString("yyyy-MM-ddTHH:mm:ssZ")
                }).ToList();

                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors du chargement des utilisateurs", error = ex.Message });
            }
        }

        [HttpGet("cashiers")]
        [Authorize(Roles = "Manager,Admin,SuperAdmin")]
        public async Task<ActionResult<IEnumerable<CashierInfoDto>>> GetCashiers()
        {
            try
            {
                var managerId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var manager = await _context.Users.FindAsync(managerId);

                if (manager == null)
                {
                    return Unauthorized(new { message = "Manager non trouvé" });
                }

                // Get cashiers from the same branch as the manager
                var cashiers = await _context.Users
                    .Where(u => u.Role == UserRole.Cashier && 
                               u.IsActive &&
                               (manager.Role == UserRole.SuperAdmin || u.BranchId == manager.BranchId))
                    .ToListAsync();

                // Check for active sessions
                var cashierIds = cashiers.Select(c => c.Id).ToList();
                var activeSessions = await _context.CashSessions
                    .Where(cs => cashierIds.Contains(cs.UserId) && cs.Status == CashSessionStatus.Open)
                    .Select(cs => cs.UserId)
                    .ToListAsync();

                var cashierInfos = cashiers.Select(c => new CashierInfoDto
                {
                    Id = c.Id,
                    FirstName = c.FirstName,
                    LastName = c.LastName,
                    Email = c.Email!,
                    HasActiveSession = activeSessions.Contains(c.Id)
                }).ToList();

                return Ok(cashierInfos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors du chargement des caissiers", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<UserInfoDto>> GetUser(string id)
        {
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null)
                {
                    return NotFound(new { message = "Utilisateur non trouvé" });
                }

                var userDto = new UserInfoDto
                {
                    Id = user.Id,
                    Email = user.Email!,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Role = user.Role.ToString(),
                    BranchId = user.BranchId,
                    IsActive = user.IsActive,
                    LastLogin = user.LastLogin?.ToString("yyyy-MM-ddTHH:mm:ssZ")
                };

                return Ok(userDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors du chargement de l'utilisateur", error = ex.Message });
            }
        }
    }

    public class CashierInfoDto
    {
        public string Id { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool HasActiveSession { get; set; }
    }
}