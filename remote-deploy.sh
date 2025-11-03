#!/bin/bash

# Script de déploiement distant pour Nala Credit Ti Machann
# À exécuter directement sur le serveur Digital Ocean

echo "🚀 Déploiement distant de Nala Credit Ti Machann"
echo "==============================================="

# Variables
APP_DIR="/var/www/nala-credit"
REPO_URL="https://github.com/cashtimachann/Nala_kredi_ti_machann.git"

# Mise à jour du système
echo "📦 Mise à jour du système..."
apt update && apt upgrade -y

# Installation de Git si nécessaire
apt install -y git curl wget

# Installation de Docker
echo "🐳 Installation de Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Installation de Docker Compose
echo "🔧 Installation de Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Clonage ou mise à jour du projet
echo "📁 Clonage/mise à jour du projet..."
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
    git pull origin main
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# Rendre les scripts exécutables
chmod +x *.sh

# Configuration du firewall
echo "🔥 Configuration du firewall..."
ufw --force enable
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS

# Création des répertoires nécessaires
echo "📁 Création des répertoires..."
mkdir -p /var/www/nala-credit/data/{postgres,redis,rabbitmq,uploads}
chown -R 1000:1000 /var/www/nala-credit/data

# Démarrage de Docker
systemctl start docker
systemctl enable docker

# Création du fichier d'environnement
echo "⚙️ Configuration de l'environnement..."
cat > .env << 'EOF'
# Nala Credit Ti Machann - Production Environment
ENVIRONMENT=production
SERVER_IP=142.93.78.111
DOMAIN_NAME=nala-credit.com

# Database
DB_PASSWORD=NalaCredit2024!@#SecurePwd
POSTGRES_DB=nalakreditimachann_db
POSTGRES_USER=nalauser

# RabbitMQ
RABBITMQ_USER=nalaadmin
RABBITMQ_PASSWORD=NalaRabbit2024!@#

# JWT
JWT_SECRET=NalaCreditJWTSecretKeyForProduction2024VeryLongAndSecure!@#$%^&*

# Monitoring
GRAFANA_PASSWORD=NalaGrafana2024!@#

COMPOSE_PROJECT_NAME=nala-credit
EOF

# Construction et déploiement
echo "🏗️ Construction et déploiement..."

# Construire les images
docker build -t nala-credit/backend:latest -f backend/Dockerfile .
docker build -t nala-credit/frontend:latest -f frontend-web/Dockerfile .

# Démarrer les services
docker-compose --env-file .env up -d

# Attendre que les services démarrent
echo "⏳ Attente du démarrage des services..."
sleep 30

# Vérifier la santé
echo "🔍 Vérification de la santé des services..."
docker-compose ps

echo ""
echo "🎉 Déploiement terminé !"
echo ""
echo "🌐 Application accessible sur: http://142.93.78.111"
echo "🔗 API: http://142.93.78.111/api"
echo "🐰 RabbitMQ: http://142.93.78.111:15672"
echo ""
echo "📋 Commandes utiles:"
echo "  docker-compose ps              # Statut des services"
echo "  docker-compose logs -f api     # Logs de l'API"
echo "  docker-compose restart api     # Redémarrer l'API"
echo "  docker-compose down            # Arrêter tous les services"
echo ""
echo "✅ Déploiement réussi !"