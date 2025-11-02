using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using NalaCreditAPI.Models;
using NalaCreditAPI.Services;
using NalaCreditAPI.DTOs;
using System.Security.Claims;

namespace NalaCreditAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly SignInManager<User> _signInManager;
    private readonly IAuthService _authService;
    private readonly IAuditService _auditService;

    public AuthController(
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        IAuthService authService,
        IAuditService auditService)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _authService = authService;
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

        return Ok(new UserInfoDto
        {
            Id = user.Id,
            Email = user.Email!,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role.ToString(),
            BranchId = user.BranchId,
            LastLogin = user.LastLogin?.ToString("yyyy-MM-ddTHH:mm:ssZ")
        });
    }
}