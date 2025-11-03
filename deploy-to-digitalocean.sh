#!/usr/bin/env bash

# ============================================
# Nala Credit Ti Machann - Digital Ocean Deployment
# ============================================
# Automated deployment script with Docker Compose
# This script will:
# 1. Install Docker & Docker Compose on server (if needed)
# 2. Copy application code to server
# 3. Setup environment variables
# 4. Build and start all services
# 5. Run database migrations
# 6. Verify deployment health
# ============================================

set -euo pipefail

# ============================================
# CONFIGURATION
# ============================================
SERVER_IP="${SERVER_IP:-142.93.78.111}"
APP_DIR="/var/www/nala-credit"
SSH_USER="${SSH_USER:-root}"
LOCAL_REPO_DIR="$(pwd)"
REMOTE_COMPOSE_FILE="$APP_DIR/docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# HELPER FUNCTIONS
# ============================================
print() { echo -e "${BLUE}ℹ️  $@${NC}"; }
success() { echo -e "${GREEN}✅ $@${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $@${NC}"; }
error() { echo -e "${RED}❌ $@${NC}"; exit 1; }

run_remote() {
    ssh "${SSH_USER}@${SERVER_IP}" "$1"
}

copy_to_server() {
    # Use rsync for efficiency; falls back to scp if rsync missing locally
    if command -v rsync >/dev/null 2>&1; then
        rsync -av --delete --exclude='.git' --exclude='node_modules' "$1" "${SSH_USER}@${SERVER_IP}:$2"
    else
        scp -r "$1" "${SSH_USER}@${SERVER_IP}:$2"
    fi
}

# ============================================
# CHECK PREREQUISITES
# ============================================
check_local_prerequisites() {
    print "Vérification des prérequis locaux..."
    
    # Check for required files
    if [[ ! -f "docker-compose.yml" ]]; then
        error "docker-compose.yml introuvable!"
    fi
    
    if [[ ! -f ".env" ]] && [[ ! -f ".env.example" ]]; then
        error "Aucun fichier .env ou .env.example trouvé!"
    fi
    
    # Create .env from example if needed
    if [[ ! -f ".env" ]] && [[ -f ".env.example" ]]; then
        warning "Fichier .env manquant. Copie de .env.example..."
        cp .env.example .env
        warning "⚠️  IMPORTANT: Éditez .env avec vos vraies valeurs de production!"
        read -p "Appuyez sur Entrée après avoir modifié .env..."
    fi
    
    success "Prérequis locaux OK"
}

# ============================================
# TEST SSH CONNECTION
# ============================================
test_ssh_connection() {
    print "Test de connexion SSH vers ${SSH_USER}@${SERVER_IP}..."
    
    if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "${SSH_USER}@${SERVER_IP}" "echo 'SSH OK'" 2>/dev/null; then
        error "Impossible de se connecter à ${SSH_USER}@${SERVER_IP}. Vérifiez votre clé SSH."
    fi
    
    success "Connexion SSH établie"
}

# ============================================
# MAIN DEPLOYMENT
# ============================================
print "🚀 Début du déploiement vers ${SERVER_IP}..."
echo ""

# Check prerequisites
check_local_prerequisites
test_ssh_connection

print "🔧 Étape 1: Installation de Docker sur le serveur"
run_remote "
    set -e
    if ! command -v docker >/dev/null 2>&1; then
        echo '📦 Installation de Docker...'
        apt-get update -qq
        apt-get install -y -qq ca-certificates curl gnupg lsb-release
        mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null
        echo \"deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \$(lsb_release -cs) stable\" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        apt-get update -qq
        apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
        systemctl enable --now docker
        echo '✅ Docker installé'
    else
        echo '✅ Docker déjà installé: $(docker --version)'
    fi
"

success "Docker installé sur le serveur"

print "📁 Étape 2: Copier l'application sur le serveur"
run_remote "mkdir -p ${APP_DIR} && chown -R ${SSH_USER}:${SSH_USER} ${APP_DIR}"
copy_to_server "$LOCAL_REPO_DIR/" "$APP_DIR/"

print "✅ Code copié dans ${APP_DIR}"

print "🔐 Étape 3: Créer \".env\" de production sur le serveur si vous avez variables locales"
if [ -f .env ]; then
    print "Copie de .env local vers le serveur..."
    copy_to_server ".env" "$APP_DIR/.env"
else
    print "Aucun .env local trouvé — vous pouvez créer $APP_DIR/.env manuellement sur le serveur."
fi

print "🛠️ Étape 4: Construction et démarrage des services"
run_remote "
    cd ${APP_DIR}
    
    # Stop existing containers
    echo '🛑 Arrêt des conteneurs existants...'
    if docker compose version >/dev/null 2>&1; then
        docker compose down --remove-orphans 2>/dev/null || true
    fi
    
    # Build and start services
    echo '🏗️  Construction des images...'
    if docker compose version >/dev/null 2>&1; then
        docker compose build --no-cache
        echo '🚀 Démarrage des services...'
        docker compose up -d --remove-orphans
    elif command -v docker-compose >/dev/null 2>&1; then
        docker-compose build --no-cache
        docker-compose up -d --remove-orphans
    else
        echo '❌ Aucun outil docker compose trouvé!' >&2
        exit 1
    fi
"

success "Services démarrés via Docker Compose"
echo ""

# ============================================
# HEALTH CHECK
# ============================================
print "🏥 Étape 5: Vérification de la santé des services"
run_remote "
    cd ${APP_DIR}
    echo 'Attente du démarrage des services...'
    sleep 10
    
    echo ''
    echo '📊 Statut des conteneurs:'
    docker compose ps
    
    echo ''
    echo '🔍 Vérification santé PostgreSQL...'
    if docker compose exec -T postgres pg_isready -U nalauser; then
        echo '✅ PostgreSQL: OK'
    else
        echo '❌ PostgreSQL: ERREUR'
    fi
    
    echo ''
    echo '🔍 Vérification santé Redis...'
    if docker compose exec -T redis redis-cli ping | grep -q PONG; then
        echo '✅ Redis: OK'
    else
        echo '❌ Redis: ERREUR'
    fi
    
    echo ''
    echo '🔍 Vérification santé API Backend...'
    sleep 5
    if curl -f http://localhost:5000/api/health 2>/dev/null; then
        echo '✅ API Backend: OK'
    else
        echo '⚠️  API Backend: En cours de démarrage...'
    fi
"

echo ""

# ============================================
# DATABASE MIGRATIONS
# ============================================
print "🗄️ Étape 6: Migrations de base de données"
read -r -p "Voulez-vous exécuter les migrations EF Core? (y/N) " RESP || RESP=N
if [[ "$RESP" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    print "Exécution des migrations..."
    run_remote "
        cd ${APP_DIR}
        echo 'Attente du backend...'
        sleep 10
        
        if docker compose exec -T api dotnet ef database update 2>/dev/null; then
            echo '✅ Migrations appliquées'
        else
            echo '⚠️  Pas de migrations trouvées ou déjà appliquées'
        fi
    " || warning "Impossible d'exécuter les migrations automatiquement"
fi

echo ""

# ============================================
# SUMMARY
# ============================================
print "🎉 Déploiement terminé!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📍 Accès à l'application"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  🌐 Application Web:     http://${SERVER_IP}"
echo "  🔗 API Backend:         http://${SERVER_IP}/api"
echo "  🐰 RabbitMQ Management: http://${SERVER_IP}:15672"
echo "  📊 Prometheus:          http://${SERVER_IP}:9090"
echo "  📈 Grafana:             http://${SERVER_IP}:3001"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📝 Commandes utiles"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Voir les logs:           ssh ${SSH_USER}@${SERVER_IP} 'cd ${APP_DIR} && docker compose logs -f'"
echo "  Redémarrer:              ssh ${SSH_USER}@${SERVER_IP} 'cd ${APP_DIR} && docker compose restart'"
echo "  Arrêter:                 ssh ${SSH_USER}@${SERVER_IP} 'cd ${APP_DIR} && docker compose down'"
echo "  Status:                  ssh ${SSH_USER}@${SERVER_IP} 'cd ${APP_DIR} && docker compose ps'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
warning "⚠️  IMPORTANT: Changez les mots de passe par défaut dans .env!"
warning "⚠️  IMPORTANT: Configurez HTTPS avec Let's Encrypt pour la production!"
echo ""