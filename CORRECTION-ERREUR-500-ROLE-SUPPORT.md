# Résolution de l'erreur 500 lors de la modification d'administrateur

## Problème rencontré

**Erreur en production:**
```
PUT https://admin.nalakreditimachann.com/api/admin/3444693c-24cc-4695-b316-0eb553e22c72 500 (Internal Server Error)
Error updating admin 3444693c-24cc-4695-b316-0eb553e22c72
System.InvalidOperationException: Role SUPPORT does not exist.
```

## Cause du problème

L'utilisateur modifié avait le type **SECRETAIRE_ADMINISTRATIF** qui correspond au rôle **Support** dans ASP.NET Identity. Cependant, ce rôle n'existait pas dans la base de données en production.

### Mapping des types d'administrateurs vers les rôles

Le code dans `AdminController.cs` fait le mapping suivant:

| AdminType | UserRole | Nom du rôle ASP.NET |
|-----------|----------|---------------------|
| DIRECTION_GENERALE | SuperAdmin | SuperAdmin |
| ADMINISTRATEUR_SYSTEME | Admin | Admin |
| COMPTABLE_FINANCE | Admin | Admin |
| DIRECTEUR_REGIONAL | Manager | Manager |
| CHEF_DE_SUCCURSALE | Manager | Manager |
| AGENT_DE_CREDIT | Employee | Employee |
| CAISSIER | Cashier | Cashier |
| **SECRETAIRE_ADMINISTRATIF** | **SupportTechnique** | **Support** ⚠️ |

## Solution appliquée

Le rôle **Support** manquant a été ajouté à la base de données en production:

```sql
INSERT INTO "AspNetRoles" ("Id", "Name", "NormalizedName", "ConcurrencyStamp") 
VALUES ('support-role', 'Support', 'SUPPORT', 'support-stamp-001');
```

### Rôles maintenant disponibles en production

```
Admin
Cashier
Employee
Manager
Secretary  (ancien rôle, non utilisé)
SuperAdmin
Support    ✅ (nouvellement ajouté)
```

## Pourquoi l'erreur n'apparaissait pas en local?

En local, le fichier `DbInitializer.cs` crée automatiquement tous les rôles nécessaires au démarrage:

```csharp
// Ligne 32 dans DbInitializer.cs
string[] roles = { "SuperAdmin", "Manager", "Cashier", "Employee", "Admin", "Support" };
```

En production, ce rôle n'avait jamais été créé lors des migrations précédentes.

## Test de validation

Pour tester que la correction fonctionne:

1. Aller sur https://admin.nalakreditimachann.com
2. Se connecter en tant qu'admin
3. Essayer de modifier un utilisateur de type **SECRETAIRE_ADMINISTRATIF**
4. La modification devrait maintenant fonctionner sans erreur 500

## Fichiers créés pour cette correction

- `add-support-role.sql` - Script SQL pour ajouter le rôle
- `fix-support-role-production.ps1` - Script PowerShell pour déployer le correctif
- `CORRECTION-ERREUR-500-ROLE-SUPPORT.md` - Ce document

## Prévention future

Pour éviter ce genre de problème:

1. **Toujours créer les rôles nécessaires dans les migrations** plutôt que de se fier uniquement à `DbInitializer`
2. **Tester toutes les fonctionnalités en staging** avant de déployer en production
3. **Vérifier les logs backend** régulièrement pour détecter les erreurs
4. **Créer une migration pour ajouter les rôles manquants**:

```csharp
// Migration suggérée
protected override void Up(MigrationBuilder migrationBuilder)
{
    migrationBuilder.Sql(@"
        INSERT INTO ""AspNetRoles"" (""Id"", ""Name"", ""NormalizedName"", ""ConcurrencyStamp"") 
        SELECT 'support-role', 'Support', 'SUPPORT', gen_random_uuid()::text
        WHERE NOT EXISTS (SELECT 1 FROM ""AspNetRoles"" WHERE ""Name"" = 'Support');
    ");
}
```

## Date de résolution

4 janvier 2026

## Statut

✅ **RÉSOLU** - Le rôle Support a été ajouté avec succès en production.
