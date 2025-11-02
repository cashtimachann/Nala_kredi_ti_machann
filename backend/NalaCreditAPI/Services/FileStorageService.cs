using NalaCreditAPI.Controllers;

namespace NalaCreditAPI.Services
{
    public interface IFileStorageService
    {
        Task<FileUploadResponseDto> UploadFileAsync(IFormFile file, string customerId, string fileType);
        Task<FileUploadResponseDto> UploadSignatureAsync(byte[] imageBytes, string customerId);
        Task<(byte[]? fileBytes, string contentType)> GetFileAsync(string fileName);
        Task<bool> DeleteFileAsync(string fileName);
        Task<List<CustomerFileDto>> GetCustomerFilesAsync(string customerId);
    }

    public class FileStorageService : IFileStorageService
    {
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<FileStorageService> _logger;
        private readonly string _baseUploadPath;
        private readonly string _baseUrl;

        public FileStorageService(
            IWebHostEnvironment environment,
            IConfiguration configuration,
            ILogger<FileStorageService> logger)
        {
            _environment = environment;
            _logger = logger;

            // Chemin de base pour les uploads (dans wwwroot/uploads)
            _baseUploadPath = Path.Combine(_environment.WebRootPath ?? _environment.ContentRootPath, "uploads");

            // URL de base pour accéder aux fichiers
            _baseUrl = configuration["FileStorage:BaseUrl"] ?? "http://localhost:7001/uploads";

            // Créer le dossier uploads s'il n'existe pas
            if (!Directory.Exists(_baseUploadPath))
            {
                Directory.CreateDirectory(_baseUploadPath);
                _logger.LogInformation("Dossier uploads créé: {Path}", _baseUploadPath);
            }
        }

        /// <summary>
        /// Upload un fichier
        /// </summary>
        public async Task<FileUploadResponseDto> UploadFileAsync(IFormFile file, string customerId, string fileType)
        {
            try
            {
                // Créer le dossier du client s'il n'existe pas
                var customerFolder = Path.Combine(_baseUploadPath, customerId);
                if (!Directory.Exists(customerFolder))
                {
                    Directory.CreateDirectory(customerFolder);
                }

                // Créer un nom de fichier unique
                var extension = Path.GetExtension(file.FileName);
                var fileName = $"{fileType}_{DateTime.UtcNow:yyyyMMdd_HHmmss}{extension}";
                var filePath = Path.Combine(customerFolder, fileName);

                // Sauvegarder le fichier
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                _logger.LogInformation(
                    "Fichier sauvegardé: {FileName} pour client {CustomerId}",
                    fileName,
                    customerId);

                // Retourner les infos du fichier
                return new FileUploadResponseDto
                {
                    FileName = fileName,
                    FileUrl = $"{_baseUrl}/{customerId}/{fileName}",
                    FileType = fileType,
                    FileSize = file.Length,
                    UploadedAt = DateTime.UtcNow
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la sauvegarde du fichier");
                throw;
            }
        }

        /// <summary>
        /// Upload une signature (base64)
        /// </summary>
        public async Task<FileUploadResponseDto> UploadSignatureAsync(byte[] imageBytes, string customerId)
        {
            try
            {
                // Créer le dossier du client s'il n'existe pas
                var customerFolder = Path.Combine(_baseUploadPath, customerId);
                if (!Directory.Exists(customerFolder))
                {
                    Directory.CreateDirectory(customerFolder);
                }

                // Créer un nom de fichier unique
                var fileName = $"signature_{DateTime.UtcNow:yyyyMMdd_HHmmss}.png";
                var filePath = Path.Combine(customerFolder, fileName);

                // Sauvegarder le fichier
                await File.WriteAllBytesAsync(filePath, imageBytes);

                _logger.LogInformation(
                    "Signature sauvegardée: {FileName} pour client {CustomerId}",
                    fileName,
                    customerId);

                // Retourner les infos du fichier
                return new FileUploadResponseDto
                {
                    FileName = fileName,
                    FileUrl = $"{_baseUrl}/{customerId}/{fileName}",
                    FileType = "signature",
                    FileSize = imageBytes.Length,
                    UploadedAt = DateTime.UtcNow
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la sauvegarde de la signature");
                throw;
            }
        }

        /// <summary>
        /// Récupérer un fichier
        /// </summary>
        public async Task<(byte[]? fileBytes, string contentType)> GetFileAsync(string fileName)
        {
            try
            {
                // Rechercher le fichier dans tous les dossiers clients
                var files = Directory.GetFiles(_baseUploadPath, fileName, SearchOption.AllDirectories);

                if (files.Length == 0)
                    return (null, string.Empty);

                var filePath = files[0];
                var fileBytes = await File.ReadAllBytesAsync(filePath);

                // Déterminer le content type
                var extension = Path.GetExtension(filePath).ToLowerInvariant();
                var contentType = extension switch
                {
                    ".jpg" or ".jpeg" => "image/jpeg",
                    ".png" => "image/png",
                    ".pdf" => "application/pdf",
                    _ => "application/octet-stream"
                };

                return (fileBytes, contentType);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération du fichier {FileName}", fileName);
                throw;
            }
        }

        /// <summary>
        /// Supprimer un fichier
        /// </summary>
        public async Task<bool> DeleteFileAsync(string fileName)
        {
            try
            {
                // Rechercher le fichier dans tous les dossiers clients
                var files = Directory.GetFiles(_baseUploadPath, fileName, SearchOption.AllDirectories);

                if (files.Length == 0)
                    return false;

                var filePath = files[0];
                File.Delete(filePath);

                _logger.LogInformation("Fichier supprimé: {FileName}", fileName);

                return await Task.FromResult(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la suppression du fichier {FileName}", fileName);
                throw;
            }
        }

        /// <summary>
        /// Obtenir tous les fichiers d'un client
        /// </summary>
        public async Task<List<CustomerFileDto>> GetCustomerFilesAsync(string customerId)
        {
            try
            {
                var customerFolder = Path.Combine(_baseUploadPath, customerId);

                if (!Directory.Exists(customerFolder))
                    return new List<CustomerFileDto>();

                var files = Directory.GetFiles(customerFolder);
                var result = new List<CustomerFileDto>();

                foreach (var filePath in files)
                {
                    var fileName = Path.GetFileName(filePath);
                    var fileInfo = new FileInfo(filePath);

                    // Déterminer le type de fichier
                    var fileType = fileName.Split('_')[0]; // Ex: "photo_20251013_123456.jpg" -> "photo"

                    result.Add(new CustomerFileDto
                    {
                        FileName = fileName,
                        FileUrl = $"{_baseUrl}/{customerId}/{fileName}",
                        FileType = fileType,
                        FileSize = fileInfo.Length,
                        UploadedAt = fileInfo.CreationTimeUtc
                    });
                }

                return await Task.FromResult(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération des fichiers du client {CustomerId}", customerId);
                throw;
            }
        }
    }
}
