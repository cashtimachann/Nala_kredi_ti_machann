#!/bin/bash
# Script de test de connectivité Frontend <-> Backend

echo "=== Test de Connectivité Nala Kredi Ti Machann ==="
echo ""

# Test 1: Vérifier si l'API backend répond
echo "1. Test de l'API Backend (https://localhost:7001)..."
curl -k -s -o /dev/null -w "%{http_code}" https://localhost:7001/api/auth/test 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ Backend accessible"
else
    echo "   ❌ Backend non accessible"
fi

# Test 2: Vérifier si le frontend React répond
echo ""
echo "2. Test du Frontend React (http://localhost:3000)..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ Frontend accessible"
else
    echo "   ❌ Frontend non accessible"
fi

# Test 3: Test de login via API
echo ""
echo "3. Test de l'endpoint de login..."
response=$(curl -k -s -X POST https://localhost:7001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cashier@nalacredit.com","password":"Cashier123!"}' \
  -w "%{http_code}")

if [[ "$response" == *"200"* ]]; then
    echo "   ✅ Endpoint de login fonctionnel"
else
    echo "   ❌ Problème avec l'endpoint de login"
fi

echo ""
echo "=== Fin des tests ==="