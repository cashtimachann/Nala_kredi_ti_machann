# Guide de Déploiement Docker - Nala Credit Ti Machann
## Digital Ocean avec Conteneurisation

### 🐳 Vue d'ensemble

Ce guide vous accompagne dans le déploiement de Nala Credit Ti Machann en utilisant Docker et Docker Compose sur Digital Ocean. Cette approche moderne offre :

- **Isolation des services** - Chaque composant dans son conteneur
- **Portabilité** - Fonctionne identiquement partout
- **Scalabilité** - Facilité de montée en charge
- **Gestion simplifiée** - Un seul fichier de configuration
- **Rollback facile** - Retour rapide à une version précédente

### 📦 Architecture Conteneurisée

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Host (Digital Ocean)              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │   Nginx     │  │   Frontend   │  │      Backend        │ │
│  │ Port 80/443 │  │   React      │  │     .NET API        │ │
│  │             │  │   Port 3000  │  │     Port 5000       │ │
│  └─────────────┘  └──────────────┘  └─────────────────────┘ │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ PostgreSQL  │  │    Redis     │  │     RabbitMQ        │ │
│  │ Port 5432   │  │  Port 6379   │  │ Port 5672/15672     │ │
│  └─────────────┘  └──────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Déploiement Rapide

### Étape 1: Préparation du serveur

**Sur le serveur Digital Ocean (142.93.78.111):**

```bash
# Connexion au serveur
ssh root@142.93.78.111

# Installation de Docker et Docker Compose
curl -fsSL https://raw.githubusercontent.com/votre-repo/nala-credit/main/install-docker.sh | bash

# Redémarrage recommandé
reboot
```

### Étape 2: Clonage et déploiement

```bash
# Reconnexion après redémarrage
ssh root@142.93.78.111

# Clonage du projet (si pas déjà fait)
git clone https://github.com/votre-repo/nala-credit.git
cd nala-credit

# Déploiement complet
./docker-deploy.sh production deploy
```

**C'est tout !** Votre application sera accessible sur http://142.93.78.111

---

## 🔧 Déploiement Détaillé

### 1. Installation Docker sur le Serveur

```bash
# Script automatisé
./install-docker.sh
```

**Ou installation manuelle :**
```bash
# Mise à jour système
apt update && apt upgrade -y

# Installation Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Installation Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 2. Configuration de l'Environment

Le script crée automatiquement un fichier `.env` avec :

```env
# Base de données
DB_PASSWORD=NalaCredit2024!@#SecurePwd
POSTGRES_DB=nalakreditimachann_db
POSTGRES_USER=nalauser

# RabbitMQ
RABBITMQ_USER=nalaadmin
RABBITMQ_PASSWORD=NalaRabbit2024!@#

# JWT
JWT_SECRET=NalaCreditJWTSecretKeyForProduction2024VeryLongAndSecure

# Serveur
SERVER_IP=142.93.78.111
DOMAIN_NAME=nala-credit.com
```

### 3. Structure des Fichiers Docker

```
nala-credit/
├── docker-compose.yml           # Orchestration des services
├── .dockerignore               # Fichiers exclus du build
├── backend/
│   └── Dockerfile              # Image API .NET
├── frontend-web/
│   ├── Dockerfile              # Image Frontend React
│   └── nginx.conf              # Config Nginx frontend
├── nginx/
│   ├── nginx.conf              # Config proxy reverse
│   └── conf.d/
│       └── nala-credit.conf    # Site spécifique
├── redis/
│   └── redis.conf              # Configuration Redis
└── monitoring/
    └── prometheus.yml          # Monitoring Prometheus
```

---

## 🎮 Commandes de Gestion

### Déploiement et Gestion

```bash
# Déploiement complet
./docker-deploy.sh production deploy

# Construction des images uniquement
./docker-deploy.sh production build

# Démarrage des services
./docker-deploy.sh production start

# Arrêt des services
./docker-deploy.sh production stop

# Redémarrage
./docker-deploy.sh production restart

# Statut des services
./docker-deploy.sh production status
```

### Logs et Monitoring

```bash
# Logs de tous les services
./docker-deploy.sh production logs

# Logs d'un service spécifique
./docker-deploy.sh production logs api
./docker-deploy.sh production logs frontend
./docker-deploy.sh production logs postgres

# Logs en temps réel
docker-compose logs -f api
```

### Maintenance

```bash
# Sauvegarde des données
./docker-deploy.sh production backup

# Nettoyage des ressources
./docker-deploy.sh production cleanup

# Vérification de santé
./docker-deploy.sh production health
```

---

## 🔍 Surveillance et Monitoring

### URLs d'Accès

- **Application Web**: http://142.93.78.111
- **API Backend**: http://142.93.78.111/api
- **RabbitMQ Management**: http://142.93.78.111:15672
- **Prometheus**: http://142.93.78.111:9090 *(si monitoring activé)*
- **Grafana**: http://142.93.78.111:3001 *(si monitoring activé)*

### Commandes Docker Utiles

```bash
# Statut des conteneurs
docker-compose ps

# Ressources utilisées
docker stats

# Inspection d'un conteneur
docker inspect nala-api

# Accès shell à un conteneur
docker-compose exec api bash
docker-compose exec postgres psql -U nalauser -d nalakreditimachann_db

# Redémarrage d'un service
docker-compose restart api
```

---

## 🔒 Sécurité et Production

### Configuration SSL (HTTPS)

1. **Obtenir un certificat SSL** (Let's Encrypt recommandé):
```bash
# Installation Certbot
apt install certbot

# Génération certificat
certbot certonly --standalone -d votre-domaine.com
```

2. **Configuration Nginx pour HTTPS**:
Décommentez la section HTTPS dans `nginx/nginx.conf`

### Sauvegardes Automatisées

```bash
# Création d'une cron job pour sauvegarde quotidienne
crontab -e

# Ajoutez cette ligne pour sauvegarde à 2h du matin
0 2 * * * /path/to/nala-credit/docker-deploy.sh production backup
```

### Monitoring Avancé

Activez le monitoring complet :
```bash
# Démarrage avec monitoring
docker-compose --profile monitoring up -d

# Ou
COMPOSE_PROFILES=monitoring docker-compose up -d
```

---

## 🛠️ Dépannage Docker

### Problèmes Courants

**1. Conteneur ne démarre pas**
```bash
# Vérifier les logs
docker-compose logs nom-du-service

# Vérifier l'état
docker-compose ps
```

**2. Problèmes de réseau**
```bash
# Recréer le réseau
docker-compose down
docker network prune
docker-compose up -d
```

**3. Problèmes de volume/données**
```bash
# Lister les volumes
docker volume ls

# Inspecter un volume
docker volume inspect nala-credit_postgres_data
```

**4. Mémoire insuffisante**
```bash
# Vérifier l'utilisation
docker stats

# Libérer de l'espace
docker system prune -a
```

### Rollback Rapide

```bash
# Arrêter les services
docker-compose down

# Revenir à une version précédente
git checkout TAG_PRECEDENT

# Redéployer
./docker-deploy.sh production deploy
```

---

## 🎯 Avantages de l'Approche Docker

### ✅ Bénéfices

1. **Déploiement uniforme** - Même environnement partout
2. **Isolation** - Chaque service indépendant
3. **Scalabilité** - Ajout facile de réplicas
4. **Rollback rapide** - Retour immédiat en cas de problème
5. **Monitoring intégré** - Logs centralisés et métriques
6. **Sécurité renforcée** - Conteneurs isolés
7. **Maintenance simplifiée** - Commandes standardisées

### 📊 Performance

- **Temps de déploiement**: ~5-10 minutes
- **Temps de rollback**: ~2-3 minutes  
- **Utilisation mémoire**: ~2-4GB (selon configuration)
- **Temps de démarrage**: ~30-60 secondes

---

## 📋 Checklist de Déploiement Docker

### Pré-déploiement
- [ ] Docker et Docker Compose installés sur le serveur
- [ ] Firewall configuré (ports 80, 443, 22)
- [ ] Certificats SSL obtenus (si HTTPS)
- [ ] Variables d'environnement configurées

### Déploiement
- [ ] Images Docker construites avec succès
- [ ] Tous les conteneurs démarrés
- [ ] Base de données initialisée et migrée
- [ ] Super administrateur créé
- [ ] Health checks passent
- [ ] Application accessible via navigateur

### Post-déploiement
- [ ] Tests fonctionnels réalisés
- [ ] Monitoring configuré
- [ ] Sauvegardes programmées
- [ ] Documentation à jour
- [ ] Équipe formée aux commandes Docker

---

## 🆘 Support

En cas de problème :

1. **Vérifiez les logs** : `./docker-deploy.sh production logs`
2. **Consultez le statut** : `./docker-deploy.sh production status`
3. **Testez la santé** : `./docker-deploy.sh production health`
4. **Référez-vous à cette documentation**

**🎉 Félicitations ! Votre application Nala Credit Ti Machann est maintenant déployée avec Docker sur Digital Ocean !**