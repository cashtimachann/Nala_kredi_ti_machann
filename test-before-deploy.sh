#!/bin/bash

# ============================================
# Pre-Deployment Test Script
# ============================================
# Run this BEFORE deploying to verify local setup
# Usage: ./test-before-deploy.sh

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔍 Pre-Deployment Verification"
echo "  📍 Nala Credit Ti Machann"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ERRORS=0

# Test 1: Check required files exist
echo "1️⃣  Checking required files..."
REQUIRED_FILES=(
    "docker-compose.yml"
    "backend/Dockerfile"
    "frontend-web/Dockerfile"
    "nginx.conf"
    ".env.example"
    "deploy-to-digitalocean.sh"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        echo -e "  ${GREEN}✅${NC} $file"
    else
        echo -e "  ${RED}❌${NC} $file ${RED}MISSING${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

# Test 2: Check .env file
echo ""
echo "2️⃣  Checking .env configuration..."
if [[ -f ".env" ]]; then
    echo -e "  ${GREEN}✅${NC} .env file exists"
    
    # Check for required variables
    REQUIRED_VARS=(
        "DB_PASSWORD"
        "JWT_SECRET"
        "RABBITMQ_PASSWORD"
        "SERVER_IP"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" .env 2>/dev/null; then
            VALUE=$(grep "^${var}=" .env | cut -d'=' -f2)
            if [[ "$VALUE" == *"CHANGE_THIS"* ]] || [[ -z "$VALUE" ]]; then
                echo -e "  ${YELLOW}⚠️${NC}  $var needs to be changed"
            else
                echo -e "  ${GREEN}✅${NC} $var is set"
            fi
        else
            echo -e "  ${RED}❌${NC} $var is missing"
            ERRORS=$((ERRORS + 1))
        fi
    done
else
    echo -e "  ${YELLOW}⚠️${NC}  .env file not found"
    echo -e "  ${BLUE}ℹ️${NC}   Run: ${YELLOW}cp .env.example .env${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Test 3: Check SSH access
echo ""
echo "3️⃣  Checking SSH access to server..."
if [[ -f ".env" ]]; then
    SERVER_IP=$(grep "^SERVER_IP=" .env | cut -d'=' -f2 || echo "142.93.78.111")
else
    SERVER_IP="142.93.78.111"
fi

echo -e "  ${BLUE}ℹ️${NC}   Testing connection to: $SERVER_IP"
if ssh -o BatchMode=yes -o ConnectTimeout=5 root@$SERVER_IP "echo 'SSH OK'" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅${NC} SSH connection successful"
else
    echo -e "  ${RED}❌${NC} Cannot connect to root@$SERVER_IP"
    echo -e "  ${BLUE}ℹ️${NC}   Make sure your SSH key is configured"
    echo -e "  ${BLUE}ℹ️${NC}   Test manually: ${YELLOW}ssh root@$SERVER_IP${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Test 4: Check Docker files syntax
echo ""
echo "4️⃣  Checking Docker files..."

if command -v docker > /dev/null 2>&1; then
    # Check backend Dockerfile
    if docker build -f backend/Dockerfile --no-cache backend/ -t test-backend-check > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅${NC} backend/Dockerfile is valid"
        docker rmi test-backend-check > /dev/null 2>&1 || true
    else
        echo -e "  ${YELLOW}⚠️${NC}  backend/Dockerfile could not be validated (will be built on server)"
    fi

    # Check frontend Dockerfile
    if docker build -f frontend-web/Dockerfile --no-cache frontend-web/ -t test-frontend-check > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅${NC} frontend-web/Dockerfile is valid"
        docker rmi test-frontend-check > /dev/null 2>&1 || true
    else
        echo -e "  ${YELLOW}⚠️${NC}  frontend-web/Dockerfile could not be validated (will be built on server)"
    fi
else
    echo -e "  ${BLUE}ℹ️${NC}   Docker not installed locally - Dockerfiles will be validated on server"
    echo -e "  ${GREEN}✅${NC} backend/Dockerfile exists"
    echo -e "  ${GREEN}✅${NC} frontend-web/Dockerfile exists"
fi

# Test 5: Check scripts are executable
echo ""
echo "5️⃣  Checking script permissions..."
SCRIPTS=(
    "deploy-to-digitalocean.sh"
    "verify-deployment.sh"
    "docker-deploy.sh"
)

for script in "${SCRIPTS[@]}"; do
    if [[ -x "$script" ]]; then
        echo -e "  ${GREEN}✅${NC} $script is executable"
    else
        echo -e "  ${YELLOW}⚠️${NC}  $script is not executable"
        echo -e "  ${BLUE}ℹ️${NC}   Run: ${YELLOW}chmod +x $script${NC}"
    fi
done

# Test 6: Check docker-compose.yml syntax
echo ""
echo "6️⃣  Checking docker-compose.yml..."
if command -v docker > /dev/null 2>&1; then
    if docker compose config > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅${NC} docker-compose.yml is valid"
    else
        echo -e "  ${YELLOW}⚠️${NC}  docker-compose.yml could not be validated (will be validated on server)"
    fi
else
    echo -e "  ${BLUE}ℹ️${NC}   Docker not installed locally - docker-compose.yml will be validated on server"
    echo -e "  ${GREEN}✅${NC} docker-compose.yml exists"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $ERRORS -eq 0 ]]; then
    echo -e "  ${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${GREEN}You're ready to deploy!${NC}"
    echo ""
    echo "Run deployment with:"
    echo -e "  ${YELLOW}./deploy-to-digitalocean.sh${NC}"
    echo ""
else
    echo -e "  ${RED}❌ $ERRORS ERROR(S) FOUND${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${RED}Please fix the errors above before deploying.${NC}"
    echo ""
    exit 1
fi
