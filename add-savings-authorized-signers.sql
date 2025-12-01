-- Migration pour ajouter le support des signataires autorisés pour les comptes d'épargne
-- Date: 2025-11-28

-- Créer la table SavingsAccountAuthorizedSigners
CREATE TABLE IF NOT EXISTS SavingsAccountAuthorizedSigners (
    Id VARCHAR(36) PRIMARY KEY,
    AccountId VARCHAR(36) NOT NULL,
    FullName VARCHAR(100) NOT NULL,
    Role VARCHAR(50),
    DocumentType INT,
    DocumentNumber VARCHAR(50),
    Phone VARCHAR(20),
    RelationshipToCustomer VARCHAR(100),
    Address VARCHAR(300),
    Signature TEXT,
    PhotoUrl VARCHAR(500),
    AuthorizationLimit DECIMAL(18,2),
    IsActive TINYINT(1) NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT FK_SavingsAccountAuthorizedSigners_SavingsAccounts 
        FOREIGN KEY (AccountId) REFERENCES SavingsAccounts(Id) ON DELETE CASCADE,
    
    INDEX IX_SavingsAccountAuthorizedSigners_AccountId (AccountId),
    INDEX IX_SavingsAccountAuthorizedSigners_IsActive (IsActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Message de confirmation
SELECT 'Table SavingsAccountAuthorizedSigners créée avec succès!' AS Message;
