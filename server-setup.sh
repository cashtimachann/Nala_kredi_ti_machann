#!/bin/bash

# Configuration initiale du serveur Digital Ocean pour Nala Credit
# À exécuter DIRECTEMENT sur le serveur 142.93.78.111

echo "🔧 Configuration initiale du serveur Digital Ocean pour Nala Credit..."

# Variables
DB_NAME="nalakreditimachann_db"
DB_USER="nalauser"
DB_PASSWORD="NalaCredit2024!@#"
APP_DIR="/var/www/nala-credit"

# Mise à jour du système
echo "📦 Mise à jour du système..."
apt update && apt upgrade -y

# Installation des prérequis de base
echo "🛠️ Installation des outils de base..."
apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates

# Installation de .NET 8
echo "⚙️ Installation de .NET 8..."
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb
apt update
apt install -y dotnet-sdk-8.0 dotnet-runtime-8.0 aspnetcore-runtime-8.0

# Installation de Node.js 18
echo "📦 Installation de Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Installation de PostgreSQL
echo "🗄️ Installation de PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# Configuration de PostgreSQL
echo "🔑 Configuration de la base de données..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || echo 'Utilisateur existe déjà'
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" || echo 'Base de données existe déjà'
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Installation de Redis
echo "🔄 Installation de Redis..."
apt install -y redis-server
systemctl start redis-server
systemctl enable redis-server

# Installation de RabbitMQ
echo "🐰 Installation de RabbitMQ..."
apt install -y rabbitmq-server
systemctl start rabbitmq-server
systemctl enable rabbitmq-server
rabbitmq-plugins enable rabbitmq_management

# Installation de Nginx
echo "🌐 Installation de Nginx..."
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# Configuration du firewall
echo "🔥 Configuration du firewall..."
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 5432  # PostgreSQL (optionnel, pour accès externe)
ufw --force enable

# Création des répertoires de l'application
echo "📁 Création des répertoires..."
mkdir -p $APP_DIR/{backend,frontend-web,uploads,logs}
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR
chmod 777 $APP_DIR/uploads

echo ""
echo "✅ Configuration du serveur terminée!"
echo ""
echo "📋 Résumé de la configuration:"
echo "  🗄️ PostgreSQL: Installé et configuré"
echo "  🔄 Redis: Installé et en marche"
echo "  🐰 RabbitMQ: Installé avec interface web (port 15672)"
echo "  🌐 Nginx: Installé et configuré"
echo "  ⚙️ .NET 8: Installé"
echo "  📦 Node.js 18: Installé"
echo ""
echo "🔑 Informations de la base de données:"
echo "  Nom: $DB_NAME"
echo "  Utilisateur: $DB_USER"
echo "  Mot de passe: $DB_PASSWORD"
echo ""
echo "🚀 Le serveur est maintenant prêt pour le déploiement de l'application!"
echo "   Vous pouvez maintenant exécuter le script de déploiement depuis votre machine locale."