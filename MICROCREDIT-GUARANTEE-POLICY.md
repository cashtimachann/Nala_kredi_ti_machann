# Politique Garantie (Epargne Bloquée) Microcrédit

La garantie (épargne bloquée) exigée lors de la création d'une demande de microcrédit dépend maintenant du type de crédit.

## Règle
- Crédit Auto (`CreditAuto`) : **30%** du montant demandé
- Crédit Moto (`CreditMoto`) : **30%** du montant demandé
- Tous les autres types de crédit : **15%** du montant demandé

## Implémentation
Dans `MicrocreditLoanApplicationService.cs` la logique calcule:
```csharp
var guaranteePercentage = (dto.LoanType == MicrocreditLoanType.CreditAuto || dto.LoanType == MicrocreditLoanType.CreditMoto)
    ? 0.30m : 0.15m;
var guaranteeAmount = dto.RequestedAmount * guaranteePercentage;
```
Le montant calculé est enregistré dans `BlockedGuaranteeAmount` et bloqué sur le compte d'épargne si le solde disponible est suffisant.

## Tests
Des tests unitaires ont été ajoutés dans `MicrocreditLoanApplicationServiceTests.cs` pour vérifier:
- 15% pour un prêt personnel
- 30% pour `CreditAuto`
- 30% pour `CreditMoto`

## Impact
- Les écrans front-end doivent continuer à afficher `BlockedGuaranteeAmount` sans changement.
- Aucune migration de base de données n'est nécessaire (changement uniquement logique).

## À Faire (Front-end si nécessaire)
- Mettre à jour les labels ou info-bulles pour refléter les nouveaux pourcentages dynamiques.

## Date de mise en vigueur
24 Nov 2025
