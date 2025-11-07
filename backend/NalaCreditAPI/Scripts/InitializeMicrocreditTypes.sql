-- Script d'initialisation des configurations de types de microcrédit
-- Ce script insère les configurations par défaut pour les 9 types de crédit

-- Crédit Loyer
INSERT INTO microcredit_loan_type_configurations (
    "Id", "Type", "Name", "Description", "MinAmount", "MaxAmount", 
    "MinDurationMonths", "MaxDurationMonths", "InterestRateMin", "InterestRateMax", 
    "DefaultInterestRate", "GracePeriodDays", "PenaltyRate", "ProcessingFeeRate", 
    "IsActive", "CreatedAt", "UpdatedAt"
) VALUES (
    gen_random_uuid(), 
    8, -- CreditLoyer
    'Crédit Loyer',
    'Financement pour le paiement du loyer résidentiel ou commercial',
    5000.00,
    100000.00,
    3,
    12,
    0.0150, -- 1.5% par mois minimum
    0.0300, -- 3% par mois maximum
    0.0200, -- 2% par mois par défaut
    7,
    0.0050, -- 0.5% pénalité par jour
    0.0200, -- 2% frais de traitement
    true,
    NOW(),
    NOW()
) ON CONFLICT ("Type") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "UpdatedAt" = NOW();

-- Crédit Auto
INSERT INTO microcredit_loan_type_configurations (
    "Id", "Type", "Name", "Description", "MinAmount", "MaxAmount", 
    "MinDurationMonths", "MaxDurationMonths", "InterestRateMin", "InterestRateMax", 
    "DefaultInterestRate", "GracePeriodDays", "PenaltyRate", "ProcessingFeeRate", 
    "IsActive", "CreatedAt", "UpdatedAt"
) VALUES (
    gen_random_uuid(), 
    9, -- CreditAuto
    'Crédit Auto',
    'Financement pour l''achat d''un véhicule automobile',
    50000.00,
    2000000.00,
    12,
    60,
    0.0100, -- 1% par mois minimum
    0.0250, -- 2.5% par mois maximum
    0.0150, -- 1.5% par mois par défaut
    0,
    0.0030, -- 0.3% pénalité par jour
    0.0300, -- 3% frais de traitement
    true,
    NOW(),
    NOW()
) ON CONFLICT ("Type") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "UpdatedAt" = NOW();

-- Crédit Moto
INSERT INTO microcredit_loan_type_configurations (
    "Id", "Type", "Name", "Description", "MinAmount", "MaxAmount", 
    "MinDurationMonths", "MaxDurationMonths", "InterestRateMin", "InterestRateMax", 
    "DefaultInterestRate", "GracePeriodDays", "PenaltyRate", "ProcessingFeeRate", 
    "IsActive", "CreatedAt", "UpdatedAt"
) VALUES (
    gen_random_uuid(), 
    10, -- CreditMoto
    'Crédit Moto',
    'Financement pour l''achat d''une motocyclette',
    10000.00,
    300000.00,
    6,
    36,
    0.0120, -- 1.2% par mois minimum
    0.0280, -- 2.8% par mois maximum
    0.0180, -- 1.8% par mois par défaut
    0,
    0.0040, -- 0.4% pénalité par jour
    0.0250, -- 2.5% frais de traitement
    true,
    NOW(),
    NOW()
) ON CONFLICT ("Type") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "UpdatedAt" = NOW();

-- Crédit Personnel
INSERT INTO microcredit_loan_type_configurations (
    "Id", "Type", "Name", "Description", "MinAmount", "MaxAmount", 
    "MinDurationMonths", "MaxDurationMonths", "InterestRateMin", "InterestRateMax", 
    "DefaultInterestRate", "GracePeriodDays", "PenaltyRate", "ProcessingFeeRate", 
    "IsActive", "CreatedAt", "UpdatedAt"
) VALUES (
    gen_random_uuid(), 
    11, -- CreditPersonnel
    'Crédit Personnel',
    'Prêt personnel pour besoins divers (événements, urgences, etc.)',
    5000.00,
    500000.00,
    3,
    24,
    0.0150, -- 1.5% par mois minimum
    0.0350, -- 3.5% par mois maximum
    0.0250, -- 2.5% par mois par défaut
    5,
    0.0050, -- 0.5% pénalité par jour
    0.0200, -- 2% frais de traitement
    true,
    NOW(),
    NOW()
) ON CONFLICT ("Type") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "UpdatedAt" = NOW();

-- Crédit Scolaire
INSERT INTO microcredit_loan_type_configurations (
    "Id", "Type", "Name", "Description", "MinAmount", "MaxAmount", 
    "MinDurationMonths", "MaxDurationMonths", "InterestRateMin", "InterestRateMax", 
    "DefaultInterestRate", "GracePeriodDays", "PenaltyRate", "ProcessingFeeRate", 
    "IsActive", "CreatedAt", "UpdatedAt"
) VALUES (
    gen_random_uuid(), 
    12, -- CreditScolaire
    'Crédit Scolaire',
    'Financement pour frais scolaires, universitaires et matériel éducatif',
    3000.00,
    300000.00,
    6,
    12,
    0.0100, -- 1% par mois minimum
    0.0200, -- 2% par mois maximum
    0.0150, -- 1.5% par mois par défaut
    30,
    0.0030, -- 0.3% pénalité par jour
    0.0150, -- 1.5% frais de traitement
    true,
    NOW(),
    NOW()
) ON CONFLICT ("Type") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "UpdatedAt" = NOW();

-- Crédit Agricole
INSERT INTO microcredit_loan_type_configurations (
    "Id", "Type", "Name", "Description", "MinAmount", "MaxAmount", 
    "MinDurationMonths", "MaxDurationMonths", "InterestRateMin", "InterestRateMax", 
    "DefaultInterestRate", "GracePeriodDays", "PenaltyRate", "ProcessingFeeRate", 
    "IsActive", "CreatedAt", "UpdatedAt"
) VALUES (
    gen_random_uuid(), 
    13, -- CreditAgricole
    'Crédit Agricole',
    'Financement pour activités agricoles (semences, équipement, intrants)',
    10000.00,
    1000000.00,
    6,
    24,
    0.0080, -- 0.8% par mois minimum
    0.0180, -- 1.8% par mois maximum
    0.0120, -- 1.2% par mois par défaut
    60,
    0.0025, -- 0.25% pénalité par jour
    0.0200, -- 2% frais de traitement
    true,
    NOW(),
    NOW()
) ON CONFLICT ("Type") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "UpdatedAt" = NOW();

-- Crédit Professionnel
INSERT INTO microcredit_loan_type_configurations (
    "Id", "Type", "Name", "Description", "MinAmount", "MaxAmount", 
    "MinDurationMonths", "MaxDurationMonths", "InterestRateMin", "InterestRateMax", 
    "DefaultInterestRate", "GracePeriodDays", "PenaltyRate", "ProcessingFeeRate", 
    "IsActive", "CreatedAt", "UpdatedAt"
) VALUES (
    gen_random_uuid(), 
    14, -- CreditProfessionnel
    'Crédit Professionnel',
    'Financement pour activités professionnelles et entrepreneuriales',
    25000.00,
    3000000.00,
    12,
    48,
    0.0100, -- 1% par mois minimum
    0.0220, -- 2.2% par mois maximum
    0.0150, -- 1.5% par mois par défaut
    15,
    0.0035, -- 0.35% pénalité par jour
    0.0250, -- 2.5% frais de traitement
    true,
    NOW(),
    NOW()
) ON CONFLICT ("Type") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "UpdatedAt" = NOW();

-- Crédit d'Appui
INSERT INTO microcredit_loan_type_configurations (
    "Id", "Type", "Name", "Description", "MinAmount", "MaxAmount", 
    "MinDurationMonths", "MaxDurationMonths", "InterestRateMin", "InterestRateMax", 
    "DefaultInterestRate", "GracePeriodDays", "PenaltyRate", "ProcessingFeeRate", 
    "IsActive", "CreatedAt", "UpdatedAt"
) VALUES (
    gen_random_uuid(), 
    15, -- CreditAppui
    'Crédit d''Appui',
    'Prêt de soutien pour situations d''urgence ou besoins immédiats',
    5000.00,
    200000.00,
    3,
    18,
    0.0150, -- 1.5% par mois minimum
    0.0300, -- 3% par mois maximum
    0.0200, -- 2% par mois par défaut
    7,
    0.0045, -- 0.45% pénalité par jour
    0.0180, -- 1.8% frais de traitement
    true,
    NOW(),
    NOW()
) ON CONFLICT ("Type") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "UpdatedAt" = NOW();

-- Crédit Hypothécaire
INSERT INTO microcredit_loan_type_configurations (
    "Id", "Type", "Name", "Description", "MinAmount", "MaxAmount", 
    "MinDurationMonths", "MaxDurationMonths", "InterestRateMin", "InterestRateMax", 
    "DefaultInterestRate", "GracePeriodDays", "PenaltyRate", "ProcessingFeeRate", 
    "IsActive", "CreatedAt", "UpdatedAt"
) VALUES (
    gen_random_uuid(), 
    16, -- CreditHypothecaire
    'Crédit Hypothécaire',
    'Financement pour achat immobilier avec garantie hypothécaire',
    500000.00,
    10000000.00,
    60,
    240,
    0.0050, -- 0.5% par mois minimum
    0.0120, -- 1.2% par mois maximum
    0.0080, -- 0.8% par mois par défaut
    0,
    0.0020, -- 0.2% pénalité par jour
    0.0300, -- 3% frais de traitement
    true,
    NOW(),
    NOW()
) ON CONFLICT ("Type") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "Description" = EXCLUDED."Description",
    "UpdatedAt" = NOW();

-- Afficher un résumé des configurations créées
SELECT 
    "Type",
    "Name",
    "MinAmount",
    "MaxAmount",
    "MinDurationMonths",
    "MaxDurationMonths",
    "DefaultInterestRate" * 100 as "DefaultInterestRate_Percent",
    "IsActive"
FROM microcredit_loan_type_configurations
ORDER BY "Type";
