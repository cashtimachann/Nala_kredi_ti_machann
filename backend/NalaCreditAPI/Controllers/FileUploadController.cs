using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NalaCreditAPI.Services;

namespace NalaCreditAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FileUploadController : ControllerBase
    {
        private readonly IFileStorageService _fileStorageService;
        private readonly ILogger<FileUploadController> _logger;

        public FileUploadController(
            IFileStorageService fileStorageService,
            ILogger<FileUploadController> logger)
        {
            _fileStorageService = fileStorageService;
            _logger = logger;
        }

        /// <summary>
        /// Upload un fichier (photo, document, signature)
        /// </summary>
        /// <param name="file">Le fichier à uploader</param>
        /// <param name="customerId">ID du client</param>
        /// <param name="fileType">Type de fichier: photo, idDocument, proofOfResidence, signature</param>
        [HttpPost("upload")]
        [RequestSizeLimit(5_242_880)] // 5MB max
        public async Task<ActionResult<FileUploadResponseDto>> UploadFile(
            [FromForm] IFormFile file,
            [FromForm] string customerId,
            [FromForm] string fileType)
        {
            try
            {
                // Validation
                if (file == null || file.Length == 0)
                    return BadRequest(new { message = "Aucun fichier fourni" });

                if (string.IsNullOrEmpty(customerId))
                    return BadRequest(new { message = "ID client requis" });

                if (string.IsNullOrEmpty(fileType))
                    return BadRequest(new { message = "Type de fichier requis" });

                // Valider le type de fichier
                var validFileTypes = new[] { "photo", "idDocument", "proofOfResidence", "signature" };
                if (!validFileTypes.Contains(fileType.ToLower()))
                    return BadRequest(new { message = $"Type de fichier invalide. Types acceptés: {string.Join(", ", validFileTypes)}" });

                // Valider la taille (5MB max)
                if (file.Length > 5_242_880)
                    return BadRequest(new { message = "Fichier trop volumineux (max 5MB)" });

                // Valider l'extension
                var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".pdf" };
                var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!allowedExtensions.Contains(extension))
                    return BadRequest(new { message = $"Extension non autorisée. Extensions acceptées: {string.Join(", ", allowedExtensions)}" });

                // Uploader le fichier
                var result = await _fileStorageService.UploadFileAsync(file, customerId, fileType);

                _logger.LogInformation(
                    "Fichier uploadé avec succès: {FileName} pour client {CustomerId}",
                    file.FileName,
                    customerId);

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'upload du fichier");
                return StatusCode(500, new { message = "Erreur lors de l'upload du fichier", error = ex.Message });
            }
        }

        /// <summary>
        /// Upload une signature en base64
        /// </summary>
        [HttpPost("upload-signature")]
        public async Task<ActionResult<FileUploadResponseDto>> UploadSignature(
            [FromBody] SignatureUploadDto dto)
        {
            try
            {
                if (string.IsNullOrEmpty(dto.Base64Data))
                    return BadRequest(new { message = "Données de signature manquantes" });

                if (string.IsNullOrEmpty(dto.CustomerId))
                    return BadRequest(new { message = "ID client requis" });

                // Convertir base64 en bytes
                var base64Data = dto.Base64Data;
                if (base64Data.Contains(","))
                {
                    base64Data = base64Data.Split(',')[1]; // Enlever le préfixe data:image/png;base64,
                }

                byte[] imageBytes = Convert.FromBase64String(base64Data);

                // Valider la taille
                if (imageBytes.Length > 1_048_576) // 1MB max pour signature
                    return BadRequest(new { message = "Signature trop volumineuse (max 1MB)" });

                var result = await _fileStorageService.UploadSignatureAsync(imageBytes, dto.CustomerId);

                _logger.LogInformation(
                    "Signature uploadée avec succès pour client {CustomerId}",
                    dto.CustomerId);

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'upload de la signature");
                return StatusCode(500, new { message = "Erreur lors de l'upload de la signature", error = ex.Message });
            }
        }

        /// <summary>
        /// Obtenir un fichier par son nom
        /// </summary>
        [HttpGet("files/{fileName}")]
        [AllowAnonymous] // Permettre l'accès public aux images
        public async Task<IActionResult> GetFile(string fileName)
        {
            try
            {
                var (fileBytes, contentType) = await _fileStorageService.GetFileAsync(fileName);

                if (fileBytes == null)
                    return NotFound(new { message = "Fichier introuvable" });

                return File(fileBytes, contentType);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération du fichier {FileName}", fileName);
                return StatusCode(500, new { message = "Erreur lors de la récupération du fichier" });
            }
        }

        /// <summary>
        /// Supprimer un fichier
        /// </summary>
        [HttpDelete("files/{fileName}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> DeleteFile(string fileName)
        {
            try
            {
                var success = await _fileStorageService.DeleteFileAsync(fileName);

                if (!success)
                    return NotFound(new { message = "Fichier introuvable" });

                _logger.LogInformation("Fichier supprimé: {FileName}", fileName);

                return Ok(new { message = "Fichier supprimé avec succès" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la suppression du fichier {FileName}", fileName);
                return StatusCode(500, new { message = "Erreur lors de la suppression du fichier" });
            }
        }

        /// <summary>
        /// Obtenir tous les fichiers d'un client
        /// </summary>
        [HttpGet("customer/{customerId}")]
        public async Task<ActionResult<List<CustomerFileDto>>> GetCustomerFiles(string customerId)
        {
            try
            {
                var files = await _fileStorageService.GetCustomerFilesAsync(customerId);
                return Ok(files);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération des fichiers du client {CustomerId}", customerId);
                return StatusCode(500, new { message = "Erreur lors de la récupération des fichiers" });
            }
        }
    }

    // DTOs
    public class FileUploadResponseDto
    {
        public string FileName { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty;
        public string FileType { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public DateTime UploadedAt { get; set; }
    }

    public class SignatureUploadDto
    {
        public string Base64Data { get; set; } = string.Empty;
        public string CustomerId { get; set; } = string.Empty;
    }

    public class CustomerFileDto
    {
        public string FileName { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty;
        public string FileType { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public DateTime UploadedAt { get; set; }
    }
}
