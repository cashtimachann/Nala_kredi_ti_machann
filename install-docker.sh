#!/bin/bash

# Installation de Docker et Docker Compose sur Digital Ocean
# À exécuter sur le serveur Ubuntu 22.04

set -e

echo "🐳 Installation de Docker sur Digital Ocean"
echo "==========================================="

# Variables
DOCKER_COMPOSE_VERSION="2.21.0"

log_info() {
    echo "ℹ️  $1"
}

log_success() {
    echo "✅ $1"
}

log_error() {
    echo "❌ $1"
}

# Mise à jour du système
log_info "Mise à jour du système..."
apt update && apt upgrade -y

# Installation des prérequis
log_info "Installation des prérequis..."
apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common \
    apt-transport-https

# Ajout de la clé GPG Docker
log_info "Ajout de la clé GPG Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Ajout du dépôt Docker
log_info "Ajout du dépôt Docker..."
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installation de Docker
log_info "Installation de Docker Engine..."
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin

# Démarrage et activation de Docker
log_info "Démarrage de Docker..."
systemctl start docker
systemctl enable docker

# Ajout de l'utilisateur au groupe Docker (si nécessaire)
if [[ $SUDO_USER ]]; then
    log_info "Ajout de l'utilisateur $SUDO_USER au groupe docker..."
    usermod -aG docker $SUDO_USER
fi

# Installation de Docker Compose
log_info "Installation de Docker Compose v$DOCKER_COMPOSE_VERSION..."
curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Création d'un lien symbolique
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Vérification des installations
log_info "Vérification des installations..."
docker --version
docker-compose --version

# Configuration du firewall pour Docker
log_info "Configuration du firewall UFW pour Docker..."
ufw --force enable
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 2376  # Docker daemon (si nécessaire)
ufw allow 2377  # Docker swarm (si nécessaire)

# Configuration Docker pour production
log_info "Configuration Docker pour production..."
mkdir -p /etc/docker

cat > /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "userland-proxy": false,
  "no-new-privileges": true,
  "default-ulimits": {
    "nofile": {
      "Hard": 64000,
      "Name": "nofile",
      "Soft": 32000
    }
  }
}
EOF

# Redémarrage Docker avec la nouvelle configuration
log_info "Redémarrage de Docker avec la nouvelle configuration..."
systemctl restart docker

# Test de Docker
log_info "Test de Docker..."
docker run --rm hello-world

# Configuration de la rotation des logs système
log_info "Configuration de la rotation des logs..."
cat > /etc/logrotate.d/docker << EOF
/var/lib/docker/containers/*/*.log {
    daily
    rotate 7
    compress
    size 10M
    missingok
    delaycompress
    copytruncate
}
EOF

# Installation d'outils de monitoring Docker (optionnel)
log_info "Installation d'outils utiles..."
apt install -y htop iotop nethogs ncdu

# Création des répertoires pour l'application
log_info "Création des répertoires de l'application..."
mkdir -p /var/www/nala-credit/{data,logs,backups,ssl}
mkdir -p /var/www/nala-credit/data/{postgres,redis,rabbitmq,uploads}

# Permissions correctes
chown -R 1000:1000 /var/www/nala-credit
chmod -R 755 /var/www/nala-credit

log_success "Installation Docker terminée!"
echo ""
echo "📋 Résumé de l'installation:"
echo "  🐳 Docker Engine: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"
echo "  🔧 Docker Compose: $(docker-compose --version | cut -d' ' -f4 | cut -d',' -f1)"
echo "  📁 Répertoires créés: /var/www/nala-credit/"
echo "  🔥 Firewall configuré"
echo "  📝 Logs configurés avec rotation"
echo ""
echo "🚀 Docker est maintenant prêt pour le déploiement de Nala Credit Ti Machann!"
echo ""
echo "🔄 Redémarrage recommandé pour finaliser l'installation:"
echo "   sudo reboot"
echo ""
echo "📖 Après le redémarrage, vous pouvez déployer avec:"
echo "   ./docker-deploy.sh production deploy"