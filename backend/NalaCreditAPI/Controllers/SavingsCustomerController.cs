using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.DTOs.Savings;
using NalaCreditAPI.Models;
using NalaCreditAPI.Services.Savings;
using System.Security.Claims;

namespace NalaCreditAPI.Controllers.Savings
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SavingsCustomerController : ControllerBase
    {
        private readonly ISavingsCustomerService _customerService;

        public SavingsCustomerController(ISavingsCustomerService customerService)
        {
            _customerService = customerService;
        }

        /// <summary>
        /// Créer un nouveau client d'épargne
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<SavingsCustomerResponseDto>> CreateCustomer([FromBody] SavingsCustomerCreateDto dto)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "Utilisateur non identifié" });

                var customer = await _customerService.CreateCustomerAsync(dto, userId);
                return CreatedAtAction(nameof(GetCustomer), new { id = customer.Id }, customer);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (DbUpdateException dbEx)
            {
                // Handle common unique constraint violations gracefully
                var message = dbEx.InnerException?.Message ?? dbEx.Message;
                if (message.Contains("SavingsCustomers_PrimaryPhone" , StringComparison.OrdinalIgnoreCase))
                    return Conflict(new { message = "Ce numéro de téléphone est déjà utilisé par un autre client" });
                if (message.Contains("SavingsCustomers_DocumentType_DocumentNumber", StringComparison.OrdinalIgnoreCase))
                    return Conflict(new { message = "Ce document d'identité est déjà utilisé par un autre client" });
                if (message.Contains("SavingsCustomers_Email", StringComparison.OrdinalIgnoreCase))
                    return Conflict(new { message = "Cette adresse email est déjà utilisée par un autre client" });
                return StatusCode(500, new { message = "Erreur lors de l'enregistrement du client", details = message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur interne du serveur", details = ex.Message });
            }
        }

        /// <summary>
        /// Obtenir un client par ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<SavingsCustomerResponseDto>> GetCustomer(string id)
        {
            var customer = await _customerService.GetCustomerAsync(id);
            if (customer == null)
                return NotFound(new { message = "Client introuvable" });

            return Ok(customer);
        }

        /// <summary>
        /// Obtenir tous les clients actifs (avec pagination)
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<List<SavingsCustomerResponseDto>>> GetAllCustomers(
            [FromQuery] int page = 1, 
            [FromQuery] int pageSize = 50)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 50;

            var customers = await _customerService.GetAllCustomersAsync(page, pageSize);
            return Ok(customers);
        }

        /// <summary>
        /// Rechercher un client par numéro de téléphone
        /// </summary>
        [HttpGet("by-phone/{phone}")]
        public async Task<ActionResult<SavingsCustomerResponseDto>> GetCustomerByPhone(string phone)
        {
            var customer = await _customerService.GetCustomerByPhoneAsync(phone);
            if (customer == null)
                return NotFound(new { message = "Client introuvable avec ce numéro" });

            return Ok(customer);
        }

        /// <summary>
        /// Rechercher un client par document d'identité
        /// </summary>
        [HttpGet("by-document")]
        public async Task<ActionResult<SavingsCustomerResponseDto>> GetCustomerByDocument(
            [FromQuery] SavingsIdentityDocumentType documentType,
            [FromQuery] string documentNumber)
        {
            if (string.IsNullOrEmpty(documentNumber))
                return BadRequest(new { message = "Le numéro de document est requis" });

            var customer = await _customerService.GetCustomerByDocumentAsync(documentType, documentNumber);
            if (customer == null)
                return NotFound(new { message = "Client introuvable avec ce document" });

            return Ok(customer);
        }

        /// <summary>
        /// Rechercher des clients par terme de recherche
        /// </summary>
        [HttpGet("search")]
        public async Task<ActionResult<List<SavingsCustomerResponseDto>>> SearchCustomers([FromQuery] string searchTerm)
        {
            if (string.IsNullOrWhiteSpace(searchTerm) || searchTerm.Length < 2)
                return BadRequest(new { message = "Le terme de recherche doit contenir au moins 2 caractères" });

            var customers = await _customerService.SearchCustomersAsync(searchTerm);
            return Ok(customers);
        }

        /// <summary>
        /// Mettre à jour un client
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<SavingsCustomerResponseDto>> UpdateCustomer(string id, [FromBody] SavingsCustomerUpdateDto dto)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "Utilisateur non identifié" });

                var customer = await _customerService.UpdateCustomerAsync(id, dto, userId);
                return Ok(customer);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (DbUpdateException dbEx)
            {
                var message = dbEx.InnerException?.Message ?? dbEx.Message;
                if (message.Contains("SavingsCustomers_PrimaryPhone" , StringComparison.OrdinalIgnoreCase))
                    return Conflict(new { message = "Ce numéro de téléphone est déjà utilisé par un autre client" });
                if (message.Contains("SavingsCustomers_DocumentType_DocumentNumber", StringComparison.OrdinalIgnoreCase))
                    return Conflict(new { message = "Ce document d'identité est déjà utilisé par un autre client" });
                if (message.Contains("SavingsCustomers_Email", StringComparison.OrdinalIgnoreCase))
                    return Conflict(new { message = "Cette adresse email est déjà utilisée par un autre client" });
                return StatusCode(500, new { message = "Erreur lors de la mise à jour du client", details = message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur interne du serveur", details = ex.Message });
            }
        }

        /// <summary>
        /// Activer ou désactiver un client (toggle status)
        /// </summary>
        [HttpPatch("{id}/toggle-status")]
        public async Task<ActionResult<SavingsCustomerResponseDto>> ToggleCustomerStatus(string id, [FromQuery] bool force = false)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "Utilisateur non identifié" });

                // Vérifier si l'utilisateur est superadmin
                var isSuperAdmin = User.IsInRole("SuperAdmin");

                var customer = await _customerService.ToggleCustomerStatusAsync(id, userId, force, isSuperAdmin);
                return Ok(customer);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur interne du serveur", details = ex.Message });
            }
        }

        /// <summary>
        /// Désactiver un client
        /// </summary>
        [HttpPost("{id}/deactivate")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult> DeactivateCustomer(string id)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "Utilisateur non identifié" });

                var success = await _customerService.DeactivateCustomerAsync(id, userId);
                if (!success)
                    return NotFound(new { message = "Client introuvable ou déjà inactif" });

                return Ok(new { message = "Client désactivé avec succès" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur interne du serveur", details = ex.Message });
            }
        }

        /// <summary>
        /// Valider les informations d'un client
        /// </summary>
        [HttpPost("{id}/validate")]
        public async Task<ActionResult<CustomerValidationDto>> ValidateCustomer(string id)
        {
            var isValid = await _customerService.ValidateCustomerAsync(id);
            
            return Ok(new CustomerValidationDto
            {
                CustomerId = id,
                IsValid = isValid,
                ValidationDate = DateTime.UtcNow,
                Message = isValid ? "Client valide" : "Client non valide - vérifiez l'âge et les documents"
            });
        }

        /// <summary>
        /// Vérifier l'unicité d'un numéro de téléphone
        /// </summary>
        [HttpGet("check-phone-unique")]
        public async Task<ActionResult<PhoneUniqueCheckDto>> CheckPhoneUnique([FromQuery] string phone, [FromQuery] string? excludeCustomerId = null)
        {
            if (string.IsNullOrEmpty(phone))
                return BadRequest(new { message = "Le numéro de téléphone est requis" });

            var existingCustomer = await _customerService.GetCustomerByPhoneAsync(phone);
            var isUnique = existingCustomer == null || existingCustomer.Id == excludeCustomerId;

            return Ok(new PhoneUniqueCheckDto
            {
                Phone = phone,
                IsUnique = isUnique,
                ExistingCustomerId = existingCustomer?.Id,
                ExistingCustomerName = existingCustomer != null ? $"{existingCustomer.FirstName} {existingCustomer.LastName}" : null
            });
        }

        /// <summary>
        /// Vérifier l'unicité d'un document d'identité
        /// </summary>
        [HttpGet("check-document-unique")]
        public async Task<ActionResult<DocumentUniqueCheckDto>> CheckDocumentUnique(
            [FromQuery] SavingsIdentityDocumentType documentType,
            [FromQuery] string documentNumber,
            [FromQuery] string? excludeCustomerId = null)
        {
            if (string.IsNullOrEmpty(documentNumber))
                return BadRequest(new { message = "Le numéro de document est requis" });

            var existingCustomer = await _customerService.GetCustomerByDocumentAsync(documentType, documentNumber);
            var isUnique = existingCustomer == null || existingCustomer.Id == excludeCustomerId;

            return Ok(new DocumentUniqueCheckDto
            {
                DocumentType = documentType,
                DocumentNumber = documentNumber,
                IsUnique = isUnique,
                ExistingCustomerId = existingCustomer?.Id,
                ExistingCustomerName = existingCustomer != null ? $"{existingCustomer.FirstName} {existingCustomer.LastName}" : null
            });
        }

        /// <summary>
        /// Upload un document pour un client
        /// </summary>
        [HttpPost("{customerId}/documents")]
        public async Task<ActionResult<SavingsCustomerDocumentResponseDto>> UploadDocument(
            string customerId, 
            [FromForm] SavingsCustomerDocumentUploadDto dto)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "Utilisateur non identifié" });

                var document = await _customerService.UploadDocumentAsync(customerId, dto, userId);
                return Ok(document);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors de l'upload du document", details = ex.Message });
            }
        }

        /// <summary>
        /// Obtenir tous les documents d'un client
        /// </summary>
        [HttpGet("{customerId}/documents")]
        public async Task<ActionResult<List<SavingsCustomerDocumentResponseDto>>> GetCustomerDocuments(string customerId)
        {
            try
            {
                var documents = await _customerService.GetCustomerDocumentsAsync(customerId);
                return Ok(documents);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors de la récupération des documents", details = ex.Message });
            }
        }

        /// <summary>
        /// Télécharger un document spécifique
        /// </summary>
        [HttpGet("{customerId}/documents/{documentId}/download")]
        public async Task<IActionResult> DownloadDocument(string customerId, string documentId)
        {
            try
            {
                var (fileBytes, mimeType, fileName) = await _customerService.DownloadDocumentAsync(customerId, documentId);
                return File(fileBytes, mimeType, fileName);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors du téléchargement", details = ex.Message });
            }
        }

        /// <summary>
        /// Supprimer un document
        /// </summary>
        [HttpDelete("{customerId}/documents/{documentId}")]
        public async Task<IActionResult> DeleteDocument(string customerId, string documentId)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "Utilisateur non identifié" });

                await _customerService.DeleteDocumentAsync(customerId, documentId);
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors de la suppression", details = ex.Message });
            }
        }

        /// <summary>
        /// Sauvegarder la signature du client
        /// </summary>
        [HttpPost("{customerId}/signature")]
        public async Task<IActionResult> SaveSignature(string customerId, [FromBody] SavingsCustomerSignatureDto dto)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { message = "Utilisateur non identifié" });

                await _customerService.SaveSignatureAsync(customerId, dto.SignatureData, userId);
                return Ok(new { message = "Signature sauvegardée avec succès" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors de la sauvegarde de la signature", details = ex.Message });
            }
        }

        /// <summary>
        /// Obtenir la signature du client
        /// </summary>
        [HttpGet("{customerId}/signature")]
        public async Task<ActionResult<string>> GetSignature(string customerId)
        {
            try
            {
                var signature = await _customerService.GetSignatureAsync(customerId);
                if (string.IsNullOrEmpty(signature))
                    return NotFound(new { message = "Signature non trouvée" });

                return Ok(new { signature });
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors de la récupération de la signature", details = ex.Message });
            }
        }
    }

    // DTOs pour les réponses spécifiques aux contrôleurs
    public class CustomerValidationDto
    {
        public string CustomerId { get; set; } = string.Empty;
        public bool IsValid { get; set; }
        public DateTime ValidationDate { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class PhoneUniqueCheckDto
    {
        public string Phone { get; set; } = string.Empty;
        public bool IsUnique { get; set; }
        public string? ExistingCustomerId { get; set; }
        public string? ExistingCustomerName { get; set; }
    }

    public class DocumentUniqueCheckDto
    {
        public SavingsIdentityDocumentType DocumentType { get; set; }
        public string DocumentNumber { get; set; } = string.Empty;
        public bool IsUnique { get; set; }
        public string? ExistingCustomerId { get; set; }
        public string? ExistingCustomerName { get; set; }
    }
}