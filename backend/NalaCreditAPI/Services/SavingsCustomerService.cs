using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs.Savings;
using NalaCreditAPI.Models;

namespace NalaCreditAPI.Services.Savings
{
    public interface ISavingsCustomerService
    {
        Task<SavingsCustomerResponseDto> CreateCustomerAsync(SavingsCustomerCreateDto dto, string userId);
        Task<SavingsCustomerResponseDto?> GetCustomerAsync(string customerId);
        Task<SavingsCustomerResponseDto?> GetCustomerByPhoneAsync(string phone);
        Task<SavingsCustomerResponseDto?> GetCustomerByDocumentAsync(SavingsIdentityDocumentType documentType, string documentNumber);
        Task<List<SavingsCustomerResponseDto>> GetAllCustomersAsync(int page = 1, int pageSize = 50);
        Task<List<SavingsCustomerResponseDto>> SearchCustomersAsync(string searchTerm);
        Task<SavingsCustomerResponseDto> UpdateCustomerAsync(string customerId, SavingsCustomerUpdateDto dto, string userId);
        Task<bool> DeactivateCustomerAsync(string customerId, string userId);
    Task<SavingsCustomerResponseDto> ToggleCustomerStatusAsync(string customerId, string userId, bool force, bool isSuperAdmin);
        Task<bool> ValidateCustomerAsync(string customerId);
        
        // Document methods
        Task<SavingsCustomerDocumentResponseDto> UploadDocumentAsync(string customerId, SavingsCustomerDocumentUploadDto dto, string userId);
        Task<List<SavingsCustomerDocumentResponseDto>> GetCustomerDocumentsAsync(string customerId);
        Task<(byte[] fileBytes, string mimeType, string fileName)> DownloadDocumentAsync(string customerId, string documentId);
        Task DeleteDocumentAsync(string customerId, string documentId);
        
        // Signature methods
        Task SaveSignatureAsync(string customerId, string signatureData, string userId);
        Task<string?> GetSignatureAsync(string customerId);
    }

    public class SavingsCustomerService : ISavingsCustomerService
    {
        private readonly ApplicationDbContext _context;

        public SavingsCustomerService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<SavingsCustomerResponseDto> CreateCustomerAsync(SavingsCustomerCreateDto dto, string userId)
        {
            // Validation des données
            await ValidateCustomerDataAsync(dto);

            var customer = new SavingsCustomer
            {
                Id = Guid.NewGuid().ToString(),
                FirstName = dto.FirstName.Trim(),
                LastName = dto.LastName.Trim(),
                CustomerCode = dto.CustomerCode?.Trim().ToUpper(),
                DateOfBirth = EnsureUtc(dto.DateOfBirth),
                Gender = dto.Gender,
                
                // Adresse
                Street = dto.Street.Trim(),
                Commune = dto.Commune.Trim(),
                Department = dto.Department.Trim(),
                Country = "Haiti",
                PostalCode = dto.PostalCode?.Trim(),
                
                // Contact
                // Normalize phone numbers before persisting to enforce unique index consistency
                PrimaryPhone = NormalizePhoneNumber(dto.PrimaryPhone.Trim()),
                SecondaryPhone = string.IsNullOrWhiteSpace(dto.SecondaryPhone) ? null : NormalizePhoneNumber(dto.SecondaryPhone.Trim()),
                Email = dto.Email?.Trim().ToLower(),
                EmergencyContactName = dto.EmergencyContactName?.Trim(),
                EmergencyContactPhone = string.IsNullOrWhiteSpace(dto.EmergencyContactPhone) ? null : NormalizePhoneNumber(dto.EmergencyContactPhone.Trim()),
                
                // Document d'identité
                DocumentType = dto.DocumentType,
                DocumentNumber = dto.DocumentNumber.Trim().ToUpper(),
                IssuedDate = EnsureUtc(dto.IssuedDate),
                ExpiryDate = dto.ExpiryDate.HasValue ? EnsureUtc(dto.ExpiryDate.Value) : null,
                IssuingAuthority = dto.IssuingAuthority.Trim(),
                
                // Informations professionnelles
                Occupation = dto.Occupation?.Trim(),
                EmployerName = dto.EmployerName?.Trim(),
                WorkAddress = dto.WorkAddress?.Trim(),
                IncomeSource = dto.IncomeSource?.Trim(),
                MonthlyIncome = dto.MonthlyIncome,
                
                // Informations personnelles additionnelles
                BirthPlace = dto.BirthPlace?.Trim(),
                Nationality = dto.Nationality?.Trim(),
                PersonalNif = dto.PersonalNif?.Trim()?.ToUpper(),
                
                // Informations familiales et sociales
                MaritalStatus = dto.MaritalStatus?.Trim(),
                NumberOfDependents = dto.NumberOfDependents,
                EducationLevel = dto.EducationLevel?.Trim(),
                
                // Business fields
                IsBusiness = dto.IsBusiness,
                CompanyName = string.IsNullOrWhiteSpace(dto.CompanyName) ? null : dto.CompanyName.Trim(),
                LegalForm = string.IsNullOrWhiteSpace(dto.LegalForm) ? null : dto.LegalForm.Trim(),
                TradeRegisterNumber = string.IsNullOrWhiteSpace(dto.TradeRegisterNumber) ? null : dto.TradeRegisterNumber.Trim().ToUpper(),
                TaxId = string.IsNullOrWhiteSpace(dto.TaxId) ? null : dto.TaxId.Trim().ToUpper(),
                HeadOfficeAddress = dto.HeadOfficeAddress?.Trim(),
                CompanyPhone = string.IsNullOrWhiteSpace(dto.CompanyPhone) ? null : NormalizePhoneNumber(dto.CompanyPhone.Trim()),
                CompanyEmail = dto.CompanyEmail?.Trim().ToLower(),
                
                // Représentant légal
                RepresentativeFirstName = string.IsNullOrWhiteSpace(dto.RepresentativeFirstName) ? null : dto.RepresentativeFirstName.Trim(),
                RepresentativeLastName = string.IsNullOrWhiteSpace(dto.RepresentativeLastName) ? null : dto.RepresentativeLastName.Trim(),
                RepresentativeTitle = dto.RepresentativeTitle?.Trim(),
                RepresentativeDocumentType = dto.RepresentativeDocumentType,
                RepresentativeDocumentNumber = string.IsNullOrWhiteSpace(dto.RepresentativeDocumentNumber) ? null : dto.RepresentativeDocumentNumber.Trim().ToUpper(),
                RepresentativeIssuedDate = dto.RepresentativeIssuedDate.HasValue ? EnsureUtc(dto.RepresentativeIssuedDate.Value) : null,
                RepresentativeExpiryDate = dto.RepresentativeExpiryDate.HasValue ? EnsureUtc(dto.RepresentativeExpiryDate.Value) : null,
                RepresentativeIssuingAuthority = string.IsNullOrWhiteSpace(dto.RepresentativeIssuingAuthority) ? null : dto.RepresentativeIssuingAuthority.Trim(),
                
                // Déclaration et acceptation
                AcceptTerms = dto.AcceptTerms,
                SignaturePlace = dto.SignaturePlace?.Trim(),
                SignatureDate = dto.SignatureDate.HasValue ? EnsureUtc(dto.SignatureDate.Value) : null,
                
                // Personne de référence
                ReferencePersonName = string.IsNullOrWhiteSpace(dto.ReferencePersonName) ? null : dto.ReferencePersonName.Trim(),
                ReferencePersonPhone = string.IsNullOrWhiteSpace(dto.ReferencePersonPhone) ? null : NormalizePhoneNumber(dto.ReferencePersonPhone.Trim()),
                
                // Métadonnées
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.SavingsCustomers.Add(customer);
            await _context.SaveChangesAsync();

            return MapToResponseDto(customer);
        }

        public async Task<SavingsCustomerResponseDto?> GetCustomerAsync(string customerId)
        {
            var customer = await _context.SavingsCustomers
                .Include(c => c.Documents)
                .FirstOrDefaultAsync(c => c.Id == customerId && c.IsActive);

            return customer != null ? MapToResponseDto(customer) : null;
        }

        public async Task<SavingsCustomerResponseDto?> GetCustomerByPhoneAsync(string phone)
        {
            var normalizedPhone = NormalizePhoneNumber(phone);
            
            var customer = await _context.SavingsCustomers
                .FirstOrDefaultAsync(c => 
                    (c.PrimaryPhone == normalizedPhone || c.SecondaryPhone == normalizedPhone) 
                    && c.IsActive);

            return customer != null ? MapToResponseDto(customer) : null;
        }

        public async Task<SavingsCustomerResponseDto?> GetCustomerByDocumentAsync(
            SavingsIdentityDocumentType documentType, 
            string documentNumber)
        {
            var normalizedDocNumber = documentNumber.Trim().ToUpper();
            
            var customer = await _context.SavingsCustomers
                .FirstOrDefaultAsync(c => 
                    c.DocumentType == documentType 
                    && c.DocumentNumber == normalizedDocNumber 
                    && c.IsActive);

            return customer != null ? MapToResponseDto(customer) : null;
        }

        public async Task<List<SavingsCustomerResponseDto>> GetAllCustomersAsync(int page = 1, int pageSize = 50)
        {
            var skip = (page - 1) * pageSize;
            
            var customers = await _context.SavingsCustomers
                .Include(c => c.Documents)
                .Where(c => c.IsActive)
                .OrderByDescending(c => c.CreatedAt)
                .Skip(skip)
                .Take(pageSize)
                .ToListAsync();

            return customers.Select(MapToResponseDto).ToList();
        }

        public async Task<List<SavingsCustomerResponseDto>> SearchCustomersAsync(string searchTerm)
        {
            if (string.IsNullOrWhiteSpace(searchTerm))
                return new List<SavingsCustomerResponseDto>();

            var searchLower = searchTerm.ToLower().Trim();
            var searchUpper = searchTerm.ToUpper().Trim();
            
            var customers = await _context.SavingsCustomers
                .Include(c => c.Documents)
                .Where(c => c.IsActive && (
                    c.FirstName.ToLower().Contains(searchLower) ||
                    c.LastName.ToLower().Contains(searchLower) ||
                    (c.FirstName + " " + c.LastName).ToLower().Contains(searchLower) ||
                    (c.CustomerCode != null && c.CustomerCode.ToUpper() == searchUpper) ||
                    c.PrimaryPhone.Contains(searchTerm) ||
                    (c.SecondaryPhone != null && c.SecondaryPhone.Contains(searchTerm)) ||
                    c.DocumentNumber.Contains(searchUpper) ||
                    (c.Email != null && c.Email.ToLower().Contains(searchLower))
                ))
                .OrderBy(c => c.FirstName)
                .ThenBy(c => c.LastName)
                .Take(20) // Limiter les résultats
                .ToListAsync();

            return customers.Select(MapToResponseDto).ToList();
        }

        public async Task<SavingsCustomerResponseDto> UpdateCustomerAsync(string customerId, SavingsCustomerUpdateDto dto, string userId)
        {
            var customer = await _context.SavingsCustomers.FindAsync(customerId)
                ?? throw new ArgumentException("Client introuvable");

            if (!customer.IsActive)
                throw new InvalidOperationException("Impossible de modifier un client inactif");

            // Valider les nouvelles données
            await ValidateCustomerDataAsync(dto, customerId);

            // Mettre à jour les données
            customer.FirstName = dto.FirstName.Trim();
            customer.LastName = dto.LastName.Trim();
            customer.DateOfBirth = EnsureUtc(dto.DateOfBirth);
            customer.Gender = dto.Gender;
            
            // Adresse
            customer.Street = dto.Street.Trim();
            customer.Commune = dto.Commune.Trim();
            customer.Department = dto.Department.Trim();
            customer.PostalCode = dto.PostalCode?.Trim();
            
            // Contact
            // Normalize phone numbers before persisting
            customer.PrimaryPhone = NormalizePhoneNumber(dto.PrimaryPhone.Trim());
            customer.SecondaryPhone = string.IsNullOrWhiteSpace(dto.SecondaryPhone) ? null : NormalizePhoneNumber(dto.SecondaryPhone.Trim());
            customer.Email = dto.Email?.Trim().ToLower();
            customer.EmergencyContactName = dto.EmergencyContactName?.Trim();
            customer.EmergencyContactPhone = string.IsNullOrWhiteSpace(dto.EmergencyContactPhone) ? null : NormalizePhoneNumber(dto.EmergencyContactPhone.Trim());
            
            // Document d'identité
            customer.DocumentType = dto.DocumentType;
            customer.DocumentNumber = dto.DocumentNumber.Trim().ToUpper();
            customer.IssuedDate = EnsureUtc(dto.IssuedDate);
            customer.ExpiryDate = dto.ExpiryDate.HasValue ? EnsureUtc(dto.ExpiryDate.Value) : null;
            customer.IssuingAuthority = dto.IssuingAuthority.Trim();
            
            // Informations professionnelles
            customer.Occupation = dto.Occupation?.Trim();
            customer.EmployerName = dto.EmployerName?.Trim();
            customer.WorkAddress = dto.WorkAddress?.Trim();
            customer.IncomeSource = dto.IncomeSource?.Trim();
            customer.MonthlyIncome = dto.MonthlyIncome;
            
            // Informations personnelles additionnelles
            customer.BirthPlace = dto.BirthPlace?.Trim();
            customer.Nationality = dto.Nationality?.Trim();
            customer.PersonalNif = dto.PersonalNif?.Trim()?.ToUpper();
            
            // Informations familiales et sociales
            customer.MaritalStatus = dto.MaritalStatus?.Trim();
            customer.NumberOfDependents = dto.NumberOfDependents;
            customer.EducationLevel = dto.EducationLevel?.Trim();
            
            // Business fields
            customer.IsBusiness = dto.IsBusiness;
            customer.CompanyName = string.IsNullOrWhiteSpace(dto.CompanyName) ? null : dto.CompanyName.Trim();
            customer.LegalForm = string.IsNullOrWhiteSpace(dto.LegalForm) ? null : dto.LegalForm.Trim();
            customer.TradeRegisterNumber = string.IsNullOrWhiteSpace(dto.TradeRegisterNumber) ? null : dto.TradeRegisterNumber.Trim().ToUpper();
            customer.TaxId = string.IsNullOrWhiteSpace(dto.TaxId) ? null : dto.TaxId.Trim().ToUpper();
            customer.HeadOfficeAddress = dto.HeadOfficeAddress?.Trim();
            customer.CompanyPhone = string.IsNullOrWhiteSpace(dto.CompanyPhone) ? null : NormalizePhoneNumber(dto.CompanyPhone.Trim());
            customer.CompanyEmail = dto.CompanyEmail?.Trim().ToLower();
            
            // Représentant légal
            // Only update representative fields when the DTO explicitly provides values. This avoids
            // accidentally clearing existing representative data when the frontend omits these keys
            // from a partial update payload.
            if (dto.RepresentativeFirstName != null)
                customer.RepresentativeFirstName = string.IsNullOrWhiteSpace(dto.RepresentativeFirstName) ? null : dto.RepresentativeFirstName.Trim();

            if (dto.RepresentativeLastName != null)
                customer.RepresentativeLastName = string.IsNullOrWhiteSpace(dto.RepresentativeLastName) ? null : dto.RepresentativeLastName.Trim();

            if (dto.RepresentativeTitle != null)
                customer.RepresentativeTitle = dto.RepresentativeTitle?.Trim();

            // RepresentativeDocumentType is nullable in the DTO; only set when present
            if (dto.RepresentativeDocumentType.HasValue)
                customer.RepresentativeDocumentType = dto.RepresentativeDocumentType;

            if (dto.RepresentativeDocumentNumber != null)
                customer.RepresentativeDocumentNumber = string.IsNullOrWhiteSpace(dto.RepresentativeDocumentNumber) ? null : dto.RepresentativeDocumentNumber.Trim().ToUpper();

            if (dto.RepresentativeIssuedDate.HasValue)
                customer.RepresentativeIssuedDate = EnsureUtc(dto.RepresentativeIssuedDate.Value);

            if (dto.RepresentativeExpiryDate.HasValue)
                customer.RepresentativeExpiryDate = EnsureUtc(dto.RepresentativeExpiryDate.Value);

            if (dto.RepresentativeIssuingAuthority != null)
                customer.RepresentativeIssuingAuthority = string.IsNullOrWhiteSpace(dto.RepresentativeIssuingAuthority) ? null : dto.RepresentativeIssuingAuthority.Trim();
            
            // Déclaration et acceptation
            customer.AcceptTerms = dto.AcceptTerms;
            customer.SignaturePlace = dto.SignaturePlace?.Trim();
            customer.SignatureDate = dto.SignatureDate.HasValue ? EnsureUtc(dto.SignatureDate.Value) : null;
            
            // Personne de référence
            customer.ReferencePersonName = string.IsNullOrWhiteSpace(dto.ReferencePersonName) ? null : dto.ReferencePersonName.Trim();
            customer.ReferencePersonPhone = string.IsNullOrWhiteSpace(dto.ReferencePersonPhone) ? null : NormalizePhoneNumber(dto.ReferencePersonPhone.Trim());
            
            // Statut
            customer.IsActive = dto.IsActive;
            customer.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToResponseDto(customer);
        }

        public async Task<bool> DeactivateCustomerAsync(string customerId, string userId)
        {
            var customer = await _context.SavingsCustomers.FindAsync(customerId);
            if (customer == null || !customer.IsActive) return false;

            // Vérifier qu'il n'y a pas de comptes actifs
            var hasActiveAccounts = await _context.SavingsAccounts
                .AnyAsync(a => a.CustomerId == customerId && a.Status == SavingsAccountStatus.Active);

            if (hasActiveAccounts)
                throw new InvalidOperationException("Impossible de désactiver un client avec des comptes actifs");

            customer.IsActive = false;
            customer.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<SavingsCustomerResponseDto> ToggleCustomerStatusAsync(string customerId, string userId, bool force, bool isSuperAdmin)
        {
            var customer = await _context.SavingsCustomers.FindAsync(customerId);
            if (customer == null)
                throw new ArgumentException("Client introuvable");

            // Si on essaie de désactiver, vérifier qu'il n'y a pas de comptes actifs
            if (customer.IsActive)
            {
                var hasActiveAccounts = await _context.SavingsAccounts
                    .AnyAsync(a => a.CustomerId == customerId && a.Status == SavingsAccountStatus.Active);

                if (hasActiveAccounts && !(force && isSuperAdmin))
                    throw new InvalidOperationException("Impossible de désactiver un client avec des comptes d'épargne actifs");
            }

            // Toggle le statut
            customer.IsActive = !customer.IsActive;
            customer.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return MapToResponseDto(customer);
        }

        public async Task<bool> ValidateCustomerAsync(string customerId)
        {
            var customer = await _context.SavingsCustomers.FindAsync(customerId);
            if (customer == null) return false;

            // Si c'est une personne morale, ignorer la validation d'âge
            if (!customer.IsBusiness)
            {
                // Validation de l'âge (minimum 18 ans)
                var age = DateTime.UtcNow.Year - customer.DateOfBirth.Year;
                if (customer.DateOfBirth.Date > DateTime.UtcNow.AddYears(-age)) age--;
                if (age < 18) return false;
            }

            // Validation du document d'identité (vérifier l'expiration)
            if (customer.ExpiryDate.HasValue && customer.ExpiryDate.Value < DateTime.UtcNow)
                return false;

            return true;
        }

        // Méthodes privées d'aide
        private async Task ValidateCustomerDataAsync(SavingsCustomerCreateDto dto, string? excludeCustomerId = null)
        {
            // Validation de l'âge (sauf pour Personne Morale)
            if (!dto.IsBusiness)
            {
                var age = DateTime.UtcNow.Year - dto.DateOfBirth.Year;
                if (dto.DateOfBirth.Date > DateTime.UtcNow.AddYears(-age)) age--;

                if (age < 18)
                    throw new ArgumentException("Le client doit être âgé d'au moins 18 ans");

                if (age > 120)
                    throw new ArgumentException("Date de naissance invalide");
            }

            // Validation du document d'identité
            if (dto.ExpiryDate.HasValue && dto.ExpiryDate.Value < DateTime.UtcNow)
                throw new ArgumentException("Le document d'identité a expiré");

            if (dto.IssuedDate > DateTime.UtcNow)
                throw new ArgumentException("La date d'émission ne peut pas être dans le futur");

            // Vérifier l'unicité du numéro de téléphone principal
            var normalizedPhone = NormalizePhoneNumber(dto.PrimaryPhone);
            var phoneExists = await _context.SavingsCustomers
                .AnyAsync(c => c.PrimaryPhone == normalizedPhone 
                    && c.IsActive 
                    && (excludeCustomerId == null || c.Id != excludeCustomerId));

            if (phoneExists)
                throw new ArgumentException("Ce numéro de téléphone est déjà utilisé par un autre client");

            // Vérifier l'unicité du document d'identité
            var normalizedDocNumber = dto.DocumentNumber.Trim().ToUpper();
            var documentExists = await _context.SavingsCustomers
                .AnyAsync(c => c.DocumentType == dto.DocumentType 
                    && c.DocumentNumber == normalizedDocNumber 
                    && c.IsActive 
                    && (excludeCustomerId == null || c.Id != excludeCustomerId));

            if (documentExists)
                throw new ArgumentException("Ce document d'identité est déjà utilisé par un autre client");

            // Vérifier l'unicité de l'email s'il est fourni
            if (!string.IsNullOrWhiteSpace(dto.Email))
            {
                var normalizedEmail = dto.Email.Trim().ToLower();
                var emailExists = await _context.SavingsCustomers
                    .AnyAsync(c => c.Email == normalizedEmail 
                        && c.IsActive 
                        && (excludeCustomerId == null || c.Id != excludeCustomerId));

                if (emailExists)
                    throw new ArgumentException("Cette adresse email est déjà utilisée par un autre client");
            }

            // Validation des départements et communes d'Haïti
            ValidateHaitianAddress(dto.Department, dto.Commune);
        }

        private static DateTime EnsureUtc(DateTime dateTime)
        {
            if (dateTime.Kind == DateTimeKind.Utc)
                return dateTime;
            
            if (dateTime.Kind == DateTimeKind.Unspecified)
                return DateTime.SpecifyKind(dateTime, DateTimeKind.Utc);
            
            return dateTime.ToUniversalTime();
        }

        private static string NormalizePhoneNumber(string phone)
        {
            // Supprimer tous les espaces et caractères spéciaux
            var normalized = phone.Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", "");
            
            // Ajouter le préfixe +509 si nécessaire
            if (normalized.StartsWith("509"))
                normalized = "+" + normalized;
            else if (!normalized.StartsWith("+509"))
                normalized = "+509" + normalized;

            return normalized;
        }

        private static void ValidateHaitianAddress(string department, string commune)
        {
            // Départements d'Haïti
            var validDepartments = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Ouest", "Sud-Est", "Nord", "Nord-Est", "Artibonite", "Centre", "Sud", "Grand'Anse", "Nippes", "Nord-Ouest"
            };

            if (!validDepartments.Contains(department))
                throw new ArgumentException($"Département invalide: {department}");

            // Validation basique des communes (liste non exhaustive)
            var commonCommunes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                // Ouest
                "Port-au-Prince", "Pétion-Ville", "Delmas", "Tabarre", "Cité Soleil", "Carrefour", "Gressier", "Léogâne", "Petit-Goâve", "Grand-Goâve",
                // Nord
                "Cap-Haïtien", "Fort-Dauphin", "Ouanaminthe", "Limonade", "Quartier-Morin",
                // Artibonite  
                "Gonaïves", "Saint-Marc", "Dessalines", "Petite-Rivière-de-l'Artibonite",
                // Sud
                "Les Cayes", "Aquin", "Saint-Louis-du-Sud", "Cavaillon",
                // Autres communes importantes
                "Jacmel", "Hinche", "Jérémie", "Port-de-Paix", "Miragoâne"
            };

            if (!commonCommunes.Contains(commune))
            {
                // Pour les communes moins courantes, on fait juste un avertissement en log
                // mais on n'empêche pas la création
                Console.WriteLine($"Commune non reconnue dans la liste standard: {commune}");
            }
        }

        private static SavingsCustomerResponseDto MapToResponseDto(SavingsCustomer customer)
        {
            return new SavingsCustomerResponseDto
            {
                Id = customer.Id,
                CustomerCode = customer.CustomerCode,
                FirstName = customer.FirstName,
                LastName = customer.LastName,
                FullName = $"{customer.FirstName} {customer.LastName}",
                DateOfBirth = customer.DateOfBirth,
                Gender = customer.Gender,
                Address = new SavingsCustomerAddressDto
                {
                    Street = customer.Street,
                    Commune = customer.Commune,
                    Department = customer.Department,
                    Country = customer.Country,
                    PostalCode = customer.PostalCode
                },
                Contact = new SavingsCustomerContactDto
                {
                    PrimaryPhone = customer.PrimaryPhone,
                    SecondaryPhone = customer.SecondaryPhone,
                    Email = customer.Email,
                    EmergencyContactName = customer.EmergencyContactName,
                    EmergencyContactPhone = customer.EmergencyContactPhone
                },
                Identity = new SavingsCustomerIdentityDto
                {
                    DocumentType = customer.DocumentType,
                    DocumentNumber = customer.DocumentNumber,
                    IssuedDate = customer.IssuedDate,
                    ExpiryDate = customer.ExpiryDate,
                    IssuingAuthority = customer.IssuingAuthority
                },
                Occupation = customer.Occupation,
                MonthlyIncome = customer.MonthlyIncome,
                Signature = customer.Signature,
                IsBusiness = customer.IsBusiness,
                CompanyName = customer.CompanyName,
                LegalForm = customer.LegalForm,
                TradeRegisterNumber = customer.TradeRegisterNumber,
                TaxId = customer.TaxId,
                HeadOfficeAddress = customer.HeadOfficeAddress,
                CompanyPhone = customer.CompanyPhone,
                CompanyEmail = customer.CompanyEmail,
                LegalRepresentative = (customer.RepresentativeFirstName != null || customer.RepresentativeLastName != null) ? new SavingsCustomerLegalRepresentativeDto
                {
                    FirstName = customer.RepresentativeFirstName,
                    LastName = customer.RepresentativeLastName,
                    Title = customer.RepresentativeTitle,
                    DocumentType = customer.RepresentativeDocumentType,
                    DocumentNumber = customer.RepresentativeDocumentNumber,
                    IssuedDate = customer.RepresentativeIssuedDate,
                    ExpiryDate = customer.RepresentativeExpiryDate,
                    IssuingAuthority = customer.RepresentativeIssuingAuthority
                } : null,
                BirthPlace = customer.BirthPlace,
                Nationality = customer.Nationality,
                PersonalNif = customer.PersonalNif,
                EmployerName = customer.EmployerName,
                WorkAddress = customer.WorkAddress,
                IncomeSource = customer.IncomeSource,
                MaritalStatus = customer.MaritalStatus,
                NumberOfDependents = customer.NumberOfDependents,
                EducationLevel = customer.EducationLevel,
                AcceptTerms = customer.AcceptTerms,
                SignaturePlace = customer.SignaturePlace,
                SignatureDate = customer.SignatureDate,
                ReferencePersonName = customer.ReferencePersonName,
                ReferencePersonPhone = customer.ReferencePersonPhone,
                Documents = customer.Documents?.Select(MapToDocumentDto).ToList() ?? new List<SavingsCustomerDocumentResponseDto>(),
                CreatedAt = customer.CreatedAt,
                UpdatedAt = customer.UpdatedAt,
                IsActive = customer.IsActive
            };
        }

        private static SavingsCustomerDocumentResponseDto MapToDocumentDto(SavingsCustomerDocument doc)
        {
            return new SavingsCustomerDocumentResponseDto
            {
                Id = doc.Id,
                CustomerId = doc.CustomerId,
                DocumentType = doc.DocumentType,
                DocumentTypeName = doc.DocumentType.ToString(),
                Name = doc.Name,
                Description = doc.Description,
                FilePath = doc.FilePath,
                FileSize = doc.FileSize,
                MimeType = doc.MimeType,
                UploadedAt = doc.UploadedAt,
                UploadedBy = doc.UploadedBy,
                Verified = doc.Verified,
                VerifiedAt = doc.VerifiedAt,
                VerifiedBy = doc.VerifiedBy,
                DownloadUrl = $"/api/SavingsCustomer/{doc.CustomerId}/documents/{doc.Id}/download"
            };
        }

        // Document management methods
        public async Task<SavingsCustomerDocumentResponseDto> UploadDocumentAsync(
            string customerId, 
            SavingsCustomerDocumentUploadDto dto, 
            string userId)
        {
            var customer = await _context.SavingsCustomers.FindAsync(customerId);
            if (customer == null)
                throw new ArgumentException("Client introuvable");

            // Validate file
            if (dto.File == null || dto.File.Length == 0)
                throw new ArgumentException("Fichier invalide");

            var allowedExtensions = new[] { ".pdf", ".jpg", ".jpeg", ".png" };
            var extension = Path.GetExtension(dto.File.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
                throw new ArgumentException("Type de fichier non autorisé. Formats acceptés: PDF, JPG, PNG");

            if (dto.File.Length > 5 * 1024 * 1024) // 5MB
                throw new ArgumentException("Le fichier ne doit pas dépasser 5MB");

            // Create directory if not exists
            var uploadsFolder = Path.Combine("uploads", "customer-documents", customerId);
            Directory.CreateDirectory(uploadsFolder);

            // Generate unique filename
            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await dto.File.CopyToAsync(stream);
            }

            // Create document record
            var document = new SavingsCustomerDocument
            {
                Id = Guid.NewGuid().ToString(),
                CustomerId = customerId,
                DocumentType = dto.DocumentType,
                Name = dto.Name,
                Description = dto.Description,
                FilePath = filePath,
                FileSize = dto.File.Length,
                MimeType = dto.File.ContentType,
                UploadedAt = DateTime.UtcNow,
                UploadedBy = userId,
                Verified = false
            };

            _context.SavingsCustomerDocuments.Add(document);
            await _context.SaveChangesAsync();

            return MapToDocumentDto(document);
        }

        public async Task<List<SavingsCustomerDocumentResponseDto>> GetCustomerDocumentsAsync(string customerId)
        {
            var customer = await _context.SavingsCustomers.FindAsync(customerId);
            if (customer == null)
                throw new ArgumentException("Client introuvable");

            var documents = await _context.SavingsCustomerDocuments
                .Where(d => d.CustomerId == customerId)
                .OrderByDescending(d => d.UploadedAt)
                .ToListAsync();

            return documents.Select(MapToDocumentDto).ToList();
        }

        public async Task<(byte[] fileBytes, string mimeType, string fileName)> DownloadDocumentAsync(
            string customerId, 
            string documentId)
        {
            var document = await _context.SavingsCustomerDocuments
                .FirstOrDefaultAsync(d => d.Id == documentId && d.CustomerId == customerId);

            if (document == null)
                throw new ArgumentException("Document introuvable");

            if (!File.Exists(document.FilePath))
                throw new ArgumentException("Fichier physique introuvable");

            var fileBytes = await File.ReadAllBytesAsync(document.FilePath);
            var fileName = document.Name + Path.GetExtension(document.FilePath);

            return (fileBytes, document.MimeType, fileName);
        }

        public async Task DeleteDocumentAsync(string customerId, string documentId)
        {
            var document = await _context.SavingsCustomerDocuments
                .FirstOrDefaultAsync(d => d.Id == documentId && d.CustomerId == customerId);

            if (document == null)
                throw new ArgumentException("Document introuvable");

            // Delete physical file
            if (File.Exists(document.FilePath))
            {
                File.Delete(document.FilePath);
            }

            // Delete database record
            _context.SavingsCustomerDocuments.Remove(document);
            await _context.SaveChangesAsync();
        }

        // Signature management methods
        public async Task SaveSignatureAsync(string customerId, string signatureData, string userId)
        {
            var customer = await _context.SavingsCustomers.FindAsync(customerId);
            if (customer == null)
                throw new ArgumentException("Client introuvable");

            customer.Signature = signatureData;
            customer.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        public async Task<string?> GetSignatureAsync(string customerId)
        {
            var customer = await _context.SavingsCustomers.FindAsync(customerId);
            if (customer == null)
                throw new ArgumentException("Client introuvable");

            return customer.Signature;
        }
    }
}
