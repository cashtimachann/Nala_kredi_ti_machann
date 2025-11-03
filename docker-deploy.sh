#!/bin/bash

# Nala Credit Ti Machann - Déploiement Docker sur Digital Ocean
# Script de construction et déploiement avec Docker Compose

set -e

echo "🚀 Déploiement Docker - Nala Credit Ti Machann"
echo "=============================================="

# Variables de configuration
ENVIRONMENT=${1:-production}
SERVER_IP="142.93.78.111"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier les prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose n'est pas installé"
        exit 1
    fi
    
    if [[ ! -f $COMPOSE_FILE ]]; then
        log_error "Fichier $COMPOSE_FILE introuvable"
        exit 1
    fi
    
    log_success "Prérequis vérifiés"
}

# Créer le fichier d'environnement
create_env_file() {
    log_info "Création du fichier d'environnement..."
    
    cat > $ENV_FILE << EOF
# Nala Credit Ti Machann - Variables d'environnement
# Généré le $(date)

# Environnement
ENVIRONMENT=$ENVIRONMENT
SERVER_IP=$SERVER_IP
DOMAIN_NAME=nala-credit.com

# Base de données
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

# Docker
COMPOSE_PROJECT_NAME=nala-credit
EOF
    
    log_success "Fichier d'environnement créé: $ENV_FILE"
}

# Construire les images Docker
build_images() {
    log_info "Construction des images Docker..."
    
    # Backend API
    log_info "Construction de l'image backend..."
    docker build -t nala-credit/backend:latest -f backend/Dockerfile .
    
    # Frontend React
    log_info "Construction de l'image frontend..."
    docker build -t nala-credit/frontend:latest -f frontend-web/Dockerfile .
    
    log_success "Images construites avec succès"
}

# Démarrer les services
start_services() {
    log_info "Démarrage des services Docker..."
    
    # Arrêter les services existants
    docker-compose down --remove-orphans 2>/dev/null || true
    
    # Démarrer en mode détaché
    docker-compose --env-file $ENV_FILE up -d
    
    log_success "Services démarrés"
}

# Vérifier la santé des services
check_health() {
    log_info "Vérification de la santé des services..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log_info "Tentative $attempt/$max_attempts..."
        
        # Vérifier PostgreSQL
        if docker-compose exec -T postgres pg_isready -U nalauser &>/dev/null; then
            log_success "PostgreSQL: OK"
        else
            log_warning "PostgreSQL: En attente..."
        fi
        
        # Vérifier Redis
        if docker-compose exec -T redis redis-cli ping &>/dev/null; then
            log_success "Redis: OK"
        else
            log_warning "Redis: En attente..."
        fi
        
        # Vérifier l'API
        if curl -f http://localhost:5000/api/health &>/dev/null; then
            log_success "API Backend: OK"
            break
        else
            log_warning "API Backend: En attente..."
        fi
        
        sleep 10
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        log_error "Échec du démarrage des services"
        docker-compose logs --tail=50
        exit 1
    fi
}

# Exécuter les migrations de base de données
run_migrations() {
    log_info "Exécution des migrations de base de données..."
    
    # Attendre que la base de données soit prête
    sleep 5
    
    # Exécuter les migrations EF Core
    docker-compose exec api dotnet ef database update || {
        log_warning "Pas de migrations EF Core trouvées ou déjà appliquées"
    }
    
    log_success "Migrations terminées"
}

# Créer le super administrateur
create_superadmin() {
    log_info "Création du compte super administrateur..."
    
    # Vérifier si le super admin existe déjà
    if docker-compose exec -T api dotnet run -- --check-superadmin &>/dev/null; then
        log_info "Super administrateur déjà existant"
    else
        docker-compose exec -T api dotnet run -- --create-superadmin || {
            log_warning "Échec de création automatique du super admin"
            log_info "Vous devrez créer le super admin manuellement"
        }
    fi
}

# Afficher le statut des services
show_status() {
    log_info "Statut des services:"
    echo ""
    
    docker-compose ps --format "table {{.Name}}\t{{.State}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    log_info "URLs d'accès:"
    echo "🌐 Application Web: http://$SERVER_IP"
    echo "🔗 API Backend: http://$SERVER_IP/api"
    echo "🐰 RabbitMQ Management: http://$SERVER_IP:15672"
    echo "📊 Prometheus (si activé): http://$SERVER_IP:9090"
    echo "📈 Grafana (si activé): http://$SERVER_IP:3001"
    echo ""
    
    log_info "Commandes utiles:"
    echo "📋 Voir les logs: docker-compose logs -f [service]"
    echo "🔄 Redémarrer un service: docker-compose restart [service]"
    echo "🛑 Arrêter tous les services: docker-compose down"
    echo "🧹 Nettoyer: docker-compose down -v --remove-orphans"
}

# Fonction de nettoyage
cleanup() {
    log_info "Nettoyage des ressources Docker inutilisées..."
    
    # Supprimer les images non utilisées
    docker image prune -f
    
    # Supprimer les réseaux non utilisés
    docker network prune -f
    
    log_success "Nettoyage terminé"
}

# Sauvegarde des données
backup_data() {
    local backup_dir="./backups/$(date +%Y%m%d_%H%M%S)"
    
    log_info "Création d'une sauvegarde dans $backup_dir..."
    
    mkdir -p "$backup_dir"
    
    # Sauvegarde PostgreSQL
    docker-compose exec -T postgres pg_dump -U nalauser nalakreditimachann_db > "$backup_dir/database.sql"
    
    # Sauvegarde des uploads
    if docker-compose exec api test -d /app/uploads 2>/dev/null; then
        docker cp "$(docker-compose ps -q api):/app/uploads" "$backup_dir/"
    fi
    
    log_success "Sauvegarde créée: $backup_dir"
}

# Fonction principale
main() {
    case ${2:-deploy} in
        "build")
            check_prerequisites
            build_images
            ;;
        "deploy")
            check_prerequisites
            create_env_file
            build_images
            start_services
            check_health
            run_migrations
            create_superadmin
            show_status
            ;;
        "start")
            docker-compose --env-file $ENV_FILE up -d
            show_status
            ;;
        "stop")
            docker-compose down
            ;;
        "restart")
            docker-compose restart
            show_status
            ;;
        "status")
            show_status
            ;;
        "logs")
            docker-compose logs -f ${3:-}
            ;;
        "cleanup")
            cleanup
            ;;
        "backup")
            backup_data
            ;;
        "health")
            check_health
            ;;
        *)
            echo "Usage: $0 [environment] [command]"
            echo ""
            echo "Environnements:"
            echo "  production (défaut)"
            echo "  development"
            echo ""
            echo "Commandes:"
            echo "  build     - Construire les images Docker"
            echo "  deploy    - Déploiement complet (défaut)"
            echo "  start     - Démarrer les services"
            echo "  stop      - Arrêter les services"
            echo "  restart   - Redémarrer les services"
            echo "  status    - Afficher le statut"
            echo "  logs      - Afficher les logs"
            echo "  cleanup   - Nettoyer les ressources"
            echo "  backup    - Créer une sauvegarde"
            echo "  health    - Vérifier la santé"
            echo ""
            echo "Exemples:"
            echo "  $0                          # Déploiement production complet"
            echo "  $0 production build         # Construire les images"
            echo "  $0 development deploy       # Déploiement développement"
            echo "  $0 production logs api      # Logs de l'API"
            ;;
    esac
}

# Exécuter le script
main "$@"