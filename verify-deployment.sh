#!/bin/bash

# ============================================
# Nala Credit Ti Machann - Deployment Verification
# ============================================
# Run this script AFTER deployment to verify everything works
# Usage: ./verify-deployment.sh [SERVER_IP]
# Example: ./verify-deployment.sh 142.93.78.111

set -e

# ============================================
# CONFIGURATION
# ============================================
SERVER_IP="${1:-142.93.78.111}"
APP_DIR="/var/www/nala-credit"
DB_NAME="nalakreditimachann_db"
DB_USER="nalauser"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔍 Nala Credit - Deployment Verification"
echo "  📍 Server: $SERVER_IP ($(date))"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Fonction pour vérifier un service
check_service() {
    local service_name=$1
    local display_name=$2
    
    if systemctl is-active --quiet $service_name; then
        echo "✅ $display_name: ACTIF"
        return 0
    else
        echo "❌ $display_name: INACTIF"
        echo "   Status: $(systemctl is-active $service_name)"
        return 1
    fi
}

# Fonction pour vérifier un port
check_port() {
    local port=$1
    local service_name=$2
    
    if ss -tlnp | grep -q ":$port "; then
        echo "✅ Port $port ($service_name): OUVERT"
        return 0
    else
        echo "❌ Port $port ($service_name): FERMÉ"
        return 1
    fi
}

# Fonction pour vérifier un fichier/répertoire
check_path() {
    local path=$1
    local type=$2
    local name=$3
    
    if [[ $type == "file" ]] && [[ -f $path ]]; then
        echo "✅ $name: TROUVÉ ($path)"
        return 0
    elif [[ $type == "dir" ]] && [[ -d $path ]]; then
        echo "✅ $name: TROUVÉ ($path)"
        return 0
    else
        echo "❌ $name: MANQUANT ($path)"
        return 1
    fi
}

echo "🔧 VÉRIFICATION DES SERVICES SYSTÈME"
echo "================================="

check_service "postgresql" "PostgreSQL"
check_service "redis-server" "Redis"
check_service "rabbitmq-server" "RabbitMQ"
check_service "nginx" "Nginx"
check_service "nala-credit-backend" "Backend API"

echo ""
echo "🌐 VÉRIFICATION DES PORTS"
echo "========================"

check_port "80" "Nginx HTTP"
check_port "5000" "Backend API"
check_port "5432" "PostgreSQL"
check_port "6379" "Redis"
check_port "5672" "RabbitMQ"
check_port "15672" "RabbitMQ Management"

echo ""
echo "📁 VÉRIFICATION DES FICHIERS"
echo "============================"

check_path "$APP_DIR" "dir" "Répertoire principal"
check_path "$APP_DIR/backend" "dir" "Répertoire backend"
check_path "$APP_DIR/frontend-web" "dir" "Répertoire frontend"
check_path "$APP_DIR/backend/NalaCreditAPI.dll" "file" "Backend DLL"
check_path "$APP_DIR/backend/appsettings.Production.json" "file" "Configuration Production"
check_path "$APP_DIR/frontend-web/index.html" "file" "Frontend HTML"
check_path "$APP_DIR/uploads" "dir" "Répertoire uploads"

echo ""
echo "🗄️ VÉRIFICATION DE LA BASE DE DONNÉES"
echo "====================================="

# Test de connexion PostgreSQL
if sudo -u postgres psql -d $DB_NAME -U $DB_USER -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Connexion à la base de données: OK"
    
    # Vérifier les tables principales
    table_count=$(sudo -u postgres psql -d $DB_NAME -U $DB_USER -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
    echo "✅ Nombre de tables: $table_count"
else
    echo "❌ Connexion à la base de données: ÉCHEC"
fi

echo ""
echo "🔄 VÉRIFICATION DES SERVICES EXTERNES"
echo "===================================="

# Test Redis
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis: ACCESSIBLE"
else
    echo "❌ Redis: INACCESSIBLE"
fi

# Test RabbitMQ
if rabbitmqctl status > /dev/null 2>&1; then
    echo "✅ RabbitMQ: ACCESSIBLE"
else
    echo "❌ RabbitMQ: INACCESSIBLE"
fi

echo ""
echo "🌐 TESTS DE CONNECTIVITÉ WEB"
echo "============================"

# Test de l'accès web local
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200\|301\|302"; then
    echo "✅ Site web (localhost): ACCESSIBLE"
else
    echo "❌ Site web (localhost): INACCESSIBLE"
fi

# Test de l'API
api_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null)
if [[ $api_response == "200" ]]; then
    echo "✅ API Health Check: OK (HTTP $api_response)"
elif [[ $api_response == "000" ]]; then
    echo "❌ API Health Check: Service inaccessible"
else
    echo "⚠️ API Health Check: HTTP $api_response"
fi

echo ""
echo "📊 INFORMATIONS SYSTÈME"
echo "======================"

echo "🖥️ Système: $(lsb_release -d | cut -f2)"
echo "💾 RAM utilisée: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "💽 Espace disque (/) : $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')"
echo "⏰ Uptime: $(uptime -p)"
echo "🔢 Charge système: $(uptime | awk -F'load average:' '{print $2}')"

echo ""
echo "📝 LOGS RÉCENTS"
echo "=============="

echo "🔍 Dernières entrées du backend (5 lignes):"
journalctl -u nala-credit-backend --no-pager -n 5 --since "5 minutes ago" 2>/dev/null | tail -5

echo ""
echo "🔍 Dernières erreurs Nginx (5 lignes):"
if [[ -f /var/log/nginx/nala-credit.error.log ]]; then
    tail -5 /var/log/nginx/nala-credit.error.log
else
    echo "Aucun fichier de log d'erreur trouvé"
fi

echo ""
echo "🎯 RÉSUMÉ DE LA VÉRIFICATION"
echo "============================"

# Compte des services actifs
services=("postgresql" "redis-server" "rabbitmq-server" "nginx" "nala-credit-backend")
active_services=0
total_services=${#services[@]}

for service in "${services[@]}"; do
    if systemctl is-active --quiet $service; then
        ((active_services++))
    fi
done

echo "📊 Services actifs: $active_services/$total_services"

# Évaluation globale
if [[ $active_services -eq $total_services ]]; then
    echo "🎉 STATUT GLOBAL: ✅ EXCELLENT - Tous les services fonctionnent"
elif [[ $active_services -ge $((total_services - 1)) ]]; then
    echo "⚠️ STATUT GLOBAL: 🟡 BON - Un service peut nécessiter attention"
else
    echo "🚨 STATUT GLOBAL: ❌ PROBLÈME - Plusieurs services nécessitent intervention"
fi

echo ""
echo "🔗 LIENS UTILES:"
echo "   Application Web: http://$(hostname -I | awk '{print $1}')"
echo "   Interface RabbitMQ: http://$(hostname -I | awk '{print $1}'):15672"
echo ""
echo "✅ Vérification terminée - $(date)"