# 🔐 GUIDE DE RÉSOLUTION - PROBLÈME DE CONNEXION

## ❌ **PROBLÈME IDENTIFIÉ**
**Erreur** : "Email ou mot de passe incorrect" lors de la connexion

## 🔍 **CAUSE**
Les comptes utilisateurs dans la base de données ne correspondent pas à ceux mentionnés dans la documentation.

## ✅ **SOLUTION**

### Étape 1: Reset de la Base de Données
```powershell
.\reset-db-ef.ps1
```

### Étape 2: Démarrage du Système
```powershell
.\quick-start.ps1
```

### Étape 3: Test de Connexion
Utilisez ces comptes **corrigés** :

| Rôle | Email | Mot de Passe |
|------|-------|--------------|
| **Caissier** | `cashier@nalacredit.com` | `Cashier123!` |
| **Agent Crédit** | `creditagent@nalacredit.com` | `CreditAgent123!` |
| **Superviseur** | `supervisor@nalacredit.com` | `Supervisor123!` |
| **Super Admin** | `superadmin@nalacredit.com` | `SuperAdmin123!` |
| **Manager Régional** | `regional@nalacredit.com` | `Regional123!` |
| **Admin Système** | `sysadmin@nalacredit.com` | `SysAdmin123!` |
| **Comptabilité** | `accounting@nalacredit.com` | `Accounting123!` |
| **Gestion** | `management@nalacredit.com` | `Management123!` |

## 🚀 **PROCÉDURE COMPLÈTE**

1. **Ouvrir PowerShell en tant qu'Administrateur**
2. **Naviguer vers le dossier projet**:
   ```powershell
   cd "C:\Users\Administrator\Desktop\Kredi Ti Machann"
   ```
3. **Exécuter le reset** :
   ```powershell
   .\reset-db-ef.ps1
   ```
4. **Démarrer le système** :
   ```powershell
   .\quick-start.ps1
   ```
5. **Tester la connexion** sur http://localhost:3000

## 🔧 **MODIFICATIONS APPORTÉES**

1. ✅ **DbInitializer.cs** : Corrected email `credit@` → `creditagent@`
2. ✅ **Mot de passe** : `Credit123!` → `CreditAgent123!`
3. ✅ **Ajout d'utilisateurs** : Tous les rôles système créés
4. ✅ **Scripts de reset** : Automatisation de la recréation DB

## ⚠️ **IMPORTANT**

- Les mots de passe respectent les politiques de sécurité (8+ caractères, majuscules, chiffres, symboles)
- Tous les comptes sont pré-activés (`EmailConfirmed = true`)
- Les utilisateurs sont assignés à la "Succursale Centrale" par défaut

## 🎯 **RÉSULTAT ATTENDU**

Après ces étapes, vous devriez pouvoir vous connecter avec n'importe lequel des comptes listés ci-dessus et accéder aux dashboards correspondants à chaque rôle.

---

**Si le problème persiste**, exécutez le test de connectivité :
```powershell
.\test-connectivity.ps1
```