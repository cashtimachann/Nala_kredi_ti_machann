# Guide de Démarrage Rapide - Nala Kredi System

## Options de Démarrage

### 1. Démarrage Complet Automatique
```powershell
.\start-system.ps1
```
Ce script démarre automatiquement tous les services nécessaires.

### 2. Démarrage Simplifié
```powershell
# Backend seulement
.\start-simple.ps1 -BackendOnly

# Frontend seulement  
.\start-simple.ps1 -FrontendOnly

# Backend + Frontend (sans infrastructure)
.\start-simple.ps1 -SkipInfrastructure
```

### 3. Démarrage Manuel

#### Étape 1: Services d'Infrastructure
```batch
# Redis (si installé)
redis-server --port 6379

# RabbitMQ (si installé)  
rabbitmq-server
```

#### Étape 2: Backend API
```powershell
cd "backend\NalaCreditAPI"
dotnet run
```

#### Étape 3: Frontend Web
```powershell
cd "frontend-web"
npm install  # première fois seulement
npm start
```

#### Étape 4: Frontend Desktop (optionnel)
```powershell
cd "frontend-desktop\NalaCreditDesktop"
dotnet run
```

## Accès au Système

Une fois démarré, le système sera accessible via:

- **Interface Web**: http://localhost:3000
- **API Documentation**: https://localhost:7001/swagger  
- **API Endpoints**: https://localhost:7001/api

## Comptes de Test

- **Super Admin**: `superadmin@nalacredit.com` / `SuperAdmin123!`
- **Superviseur**: `supervisor@nalacredit.com` / `Supervisor123!`
- **Caissier**: `cashier@nalacredit.com` / `Cashier123!`
- **Agent Crédit**: `credit@nalacredit.com` / `Credit123!`

## Dépannage

### Erreur "Port déjà utilisé"
Vérifiez quels processus utilisent les ports:
```powershell
netstat -ano | findstr :5432  # PostgreSQL
netstat -ano | findstr :6379  # Redis
netstat -ano | findstr :5672  # RabbitMQ
netstat -ano | findstr :7001  # API Backend
netstat -ano | findstr :3000  # Frontend
```

### Services non démarrés
- Vérifiez que .NET 8.0 SDK est installé: `dotnet --version`
- Vérifiez que Node.js est installé: `node --version` 
- Vérifiez que PostgreSQL est en cours d'exécution
- Redis et RabbitMQ sont optionnels pour le développement

### Base de données
Si erreur de connexion à la base de données:
```powershell
cd "backend\NalaCreditAPI"
dotnet ef database update
```

## Support

- Documentation complète: README.md
- Logs API: Console du backend
- Logs Frontend: Console navigateur (F12)