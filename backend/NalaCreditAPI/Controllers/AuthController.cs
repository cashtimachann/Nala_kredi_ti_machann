using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using NalaCreditAPI.Models;
using NalaCreditAPI.Services;
using NalaCreditAPI.DTOs;
using System.Security.Claims;

namespace NalaCreditAPI.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly SignInManager<User> _signInManager;
    private readonly IAuthService _authService;
    private readonly IBranchService _branchService;
    private readonly IAuditService _auditService;

    public AuthController(
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        IAuthService authService,
        IAuditService auditService,
        IBranchService branchService)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _authService = authService;
        _branchService = branchService;
        _auditService = auditService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await _userManager.FindByEmailAsync(model.Email);
        if (user == null || !user.IsActive)
        {
            await _auditService.LogAsync("Failed Login Attempt", "User", model.Email, "Anonymous");
            return Unauthorized(new { message = "Invalid credentials" });
        }

        // Check if user is accessing from correct domain
        var host = Request.Host.Host.ToLower();
        var allowedDomain = GetAllowedDomainForRole(user.Role);
        
        string currentDomain = "";
        if (host.StartsWith("admin."))
        {
            currentDomain = "admin";
        }
        else if (host.StartsWith("branch."))
        {
            currentDomain = "branch";
        }
        
        // Only enforce domain restriction for production domains
        // "both" means user can access from any domain
        if (!string.IsNullOrEmpty(currentDomain) && allowedDomain != "both" && currentDomain != allowedDomain)
        {
            await _auditService.LogAsync($"Login Denied - Wrong Domain", "User", user.Id, user.Id);
            return Unauthorized(new 
            { 
                message = $"Access denied. Please login at: https://{allowedDomain}.nalakreditimachann.com",
                correctDomain = $"https://{allowedDomain}.nalakreditimachann.com"
            });
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, model.Password, lockoutOnFailure: true);
        
        if (result.IsLockedOut)
        {
            await _auditService.LogAsync("Account Locked", "User", user.Id, user.Id);
            return Unauthorized(new { message = "Account locked due to multiple failed attempts" });
        }

        if (!result.Succeeded)
        {
            await _auditService.LogAsync("Failed Login", "User", user.Id, user.Id);
            return Unauthorized(new { message = "Invalid credentials" });
        }

        // Check if 2FA is enabled (for now, we'll implement TOTP later)
        if (result.RequiresTwoFactor)
        {
            // Generate 2FA token and send via SMS/Email
            var token = await _userManager.GenerateTwoFactorTokenAsync(user, "Email");
            // In a real implementation, send this token via email/SMS
            
            return Ok(new
            {
                requiresTwoFactor = true,
                message = "Two-factor authentication required. Check your email for the verification code."
            });
        }

        var jwtToken = await _authService.GenerateJwtToken(user);
        
        // Update last login
        user.LastLogin = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        await _auditService.LogAsync("Successful Login", "User", user.Id, user.Id);

        var userDto = new UserInfoDto
        {
            Id = user.Id,
            Email = user.Email!,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role.ToString(),
            BranchId = user.BranchId
        };

        if (user.BranchId.HasValue)
        {
            try
            {
                var branch = await _branchService.GetBranchAsync(user.BranchId.Value);
                userDto.BranchName = branch?.Name;
            }
            catch (KeyNotFoundException) { /* ignore missing branch */ }
            catch (Exception)
            {
                // ignore any branch lookup failure
            }
        }

        return Ok(new LoginResponseDto { Token = jwtToken, User = userDto });
    }

    [HttpPost("verify-2fa")]
    public async Task<ActionResult<LoginResponseDto>> VerifyTwoFactor([FromBody] TwoFactorDto model)
    {
        var user = await _userManager.FindByEmailAsync(model.Email);
        if (user == null)
            return BadRequest("Invalid request");

        var isValid = await _userManager.VerifyTwoFactorTokenAsync(user, "Email", model.Code);
        if (!isValid)
        {
            await _auditService.LogAsync("Failed 2FA Verification", "User", user.Id, user.Id);
            return BadRequest("Invalid verification code");
        }

        var jwtToken = await _authService.GenerateJwtToken(user);
        
        user.LastLogin = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        await _auditService.LogAsync("Successful 2FA Login", "User", user.Id, user.Id);

        return Ok(new LoginResponseDto
        {
            Token = jwtToken,
            User = new UserInfoDto
            {
                Id = user.Id,
                Email = user.Email!,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = user.Role.ToString(),
                BranchId = user.BranchId
            }
        });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordDto model)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId!);
        
        if (user == null)
            return NotFound();

        var result = await _userManager.ChangePasswordAsync(user, model.CurrentPassword, model.NewPassword);
        
        if (!result.Succeeded)
            return BadRequest(result.Errors);

        await _auditService.LogAsync("Password Changed", "User", user.Id, user.Id);
        return Ok(new { message = "Password changed successfully" });
    }

    [HttpPost("reset-password")]
    public async Task<ActionResult> ResetPassword([FromBody] ResetPasswordDto model)
    {
        var user = await _userManager.FindByEmailAsync(model.Email);
        if (user == null)
            return Ok(new { message = "If the email exists, a reset link has been sent." });

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        
        // In a real implementation, send this token via email
        // For now, we'll just log it for testing purposes
        await _auditService.LogAsync("Password Reset Requested", "User", user.Id, user.Id);
        
        return Ok(new { message = "If the email exists, a reset link has been sent.", token = token });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<ActionResult> Logout()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        await _auditService.LogAsync("User Logout", "User", userId, userId!);
        
        return Ok(new { message = "Logged out successfully" });
    }

    [HttpGet("profile")]
    [Authorize]
    public async Task<ActionResult<UserInfoDto>> GetProfile()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId!);
        
        if (user == null)
            return NotFound();

        var profileDto = new UserInfoDto
        {
            Id = user.Id,
            Email = user.Email!,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role.ToString(),
            BranchId = user.BranchId,
            LastLogin = user.LastLogin?.ToString("yyyy-MM-ddTHH:mm:ssZ")
        };

        if (user.BranchId.HasValue)
        {
            try
            {
                var branch = await _branchService.GetBranchAsync(user.BranchId.Value);
                profileDto.BranchName = branch?.Name;
            }
            catch (KeyNotFoundException) { }
            catch { }
        }

        return Ok(profileDto);
    }

    private string GetAllowedDomainForRole(UserRole role)
    {
        return role switch
        {
            UserRole.Manager => "branch",  // Branch Manager only on branch domain
            UserRole.SuperAdmin => "admin", // SuperAdmin only on admin domain
            UserRole.Admin => "admin",      // Admin only on admin domain
            UserRole.Secretary => "branch",  // Secretary works at branch level
            UserRole.Cashier => "branch",   // Cashier on branch domain
            UserRole.Employee => "branch",  // Employee on branch domain
            _ => "branch"
        };
    }
}