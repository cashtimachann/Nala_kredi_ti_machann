using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Models;
using NalaCreditAPI.Data;

namespace NalaCreditAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DatabaseCheckController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<User> _userManager;

    public DatabaseCheckController(ApplicationDbContext context, UserManager<User> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetAllUsers()
    {
        try
        {
            var users = await _userManager.Users.Select(u => new
            {
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                u.Role,
                u.IsActive,
                u.EmailConfirmed,
                u.BranchId
            }).ToListAsync();

            var totalCount = users.Count;
            var activeCount = users.Count(u => u.IsActive);

            return Ok(new
            {
                TotalUsers = totalCount,
                ActiveUsers = activeCount,
                Users = users,
                Message = totalCount > 0 
                    ? $"✅ {totalCount} utilisateur(s) trouvé(s) dans la base de données" 
                    : "❌ Aucun utilisateur dans la base de données"
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                Error = "Erreur lors de la lecture des utilisateurs",
                Details = ex.Message
            });
        }
    }

    [HttpGet("roles")]
    public async Task<IActionResult> GetAllRoles()
    {
        try
        {
            var roles = await _context.Roles.Select(r => new
            {
                r.Id,
                r.Name,
                r.NormalizedName
            }).ToListAsync();

            return Ok(new
            {
                TotalRoles = roles.Count,
                Roles = roles
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                Error = "Erreur lors de la lecture des rôles",
                Details = ex.Message
            });
        }
    }

    [HttpGet("branches")]
    public async Task<IActionResult> GetAllBranches()
    {
        try
        {
            var branches = await _context.Branches.Select(b => new
            {
                b.Id,
                b.Name,
                b.Address,
                b.IsActive,
                Phone = b.Phones.FirstOrDefault(),
                b.Region
            }).ToListAsync();

            return Ok(new
            {
                TotalBranches = branches.Count,
                Branches = branches
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                Error = "Erreur lors de la lecture des branches",
                Details = ex.Message
            });
        }
    }

    [HttpGet("database-status")]
    public async Task<IActionResult> GetDatabaseStatus()
    {
        try
        {
            var userCount = await _userManager.Users.CountAsync();
            var roleCount = await _context.Roles.CountAsync();
            var branchCount = await _context.Branches.CountAsync();
            var configCount = await _context.SystemConfigurations.CountAsync();

            // Test de connexion à la base
            var canConnect = await _context.Database.CanConnectAsync();

            return Ok(new
            {
                DatabaseConnected = canConnect,
                Statistics = new
                {
                    TotalUsers = userCount,
                    TotalRoles = roleCount,
                    TotalBranches = branchCount,
                    TotalConfigurations = configCount
                },
                Status = canConnect 
                    ? "✅ Base de données opérationnelle" 
                    : "❌ Problème de connexion à la base de données",
                DatabaseName = "nalakreditimachann_db"
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                Error = "Erreur lors de la vérification du statut",
                Details = ex.Message,
                Status = "❌ Erreur de connexion à la base de données"
            });
        }
    }
}