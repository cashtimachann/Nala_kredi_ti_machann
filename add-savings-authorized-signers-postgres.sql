-- Migration pour ajouter le support des signataires autorisés pour les comptes d'épargne
-- Date: 2025-11-28
-- Base de données: PostgreSQL

-- Créer la table SavingsAccountAuthorizedSigners
CREATE TABLE IF NOT EXISTS "SavingsAccountAuthorizedSigners" (
    "Id" VARCHAR(36) PRIMARY KEY,
    "AccountId" VARCHAR(36) NOT NULL,
    "FullName" VARCHAR(100) NOT NULL,
    "Role" VARCHAR(50),
    "DocumentType" INTEGER,
    "DocumentNumber" VARCHAR(50),
    "Phone" VARCHAR(20),
    "RelationshipToCustomer" VARCHAR(100),
    "Address" VARCHAR(300),
    "Signature" TEXT,
    "PhotoUrl" VARCHAR(500),
    "AuthorizationLimit" NUMERIC(18,2),
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "FK_SavingsAccountAuthorizedSigners_SavingsAccounts" 
        FOREIGN KEY ("AccountId") REFERENCES "SavingsAccounts"("Id") ON DELETE CASCADE
);

-- Créer les index
CREATE INDEX IF NOT EXISTS "IX_SavingsAccountAuthorizedSigners_AccountId" 
    ON "SavingsAccountAuthorizedSigners"("AccountId");

CREATE INDEX IF NOT EXISTS "IX_SavingsAccountAuthorizedSigners_IsActive" 
    ON "SavingsAccountAuthorizedSigners"("IsActive");

-- Message de confirmation
SELECT 'Table SavingsAccountAuthorizedSigners créée avec succès!' AS "Message";
