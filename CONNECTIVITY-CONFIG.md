# Configuration de connectivité Frontend-Backend

## Configuration Backend (API)
- **URL de base** : `https://localhost:7001/api`
- **Port** : 7001
- **Protocole** : HTTPS
- **Base de données** : PostgreSQL
- **Database** : `nalakreditimachann_db`
- **Username** : `postgres`
- **Password** : `JCS823ch!!`

## Configuration Frontend (React)
- **URL** : `http://localhost:3000`
- **Port** : 3000
- **Protocole** : HTTP
- **Variables d'environnement** :
  - `REACT_APP_API_URL=https://localhost:7001/api`
  - `REACT_APP_SIGNALR_URL=https://localhost:7001/notificationHub`

## CORS Configuration
Le backend est configuré pour accepter les requêtes depuis :
- `http://localhost:3000` (Development)
- `https://localhost:3000` (HTTPS Development)
- Avec support des credentials pour SignalR

## Endpoints Principaux
- **Login** : `POST /api/auth/login`
- **Dashboard Caissier** : `GET /api/dashboard/cashier`
- **Dashboard Agent Crédit** : `GET /api/dashboard/credit-agent`
- **Dashboard Superviseur** : `GET /api/dashboard/branch-supervisor`
- **SignalR Hub** : `/notificationHub`

## Test de Connectivité
Utilisez le script : `.\test-connectivity.ps1`

## Comptes de Test
- **Caissier** : `cashier@nalacredit.com` / `Cashier123!`
- **Agent Crédit** : `creditagent@nalacredit.com` / `CreditAgent123!`
- **Superviseur** : `supervisor@nalacredit.com` / `Supervisor123!`
- **Super Admin** : `superadmin@nalacredit.com` / `SuperAdmin123!`

## Services Requis
1. **PostgreSQL** : Service `postgresql` doit être démarré
2. **Redis** (optionnel) : Pour le cache
3. **RabbitMQ** (optionnel) : Pour les messages