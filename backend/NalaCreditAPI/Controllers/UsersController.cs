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
}