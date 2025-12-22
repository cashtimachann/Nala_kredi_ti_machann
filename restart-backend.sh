#!/bin/bash

SSH_KEY="$HOME/.ssh/nala_deployment_rsa"
SERVER_IP="142.93.78.111"

echo "🔄 Ap redimare backend pou trigger database initialization..."
echo ""

ssh -i "$SSH_KEY" root@$SERVER_IP << 'ENDSSH'

cd /var/www/nala-credit

echo "📊 Status backend anvan restart:"
docker ps --filter name=nala-api --format "{{.Names}}: {{.Status}}"

echo ""
echo "🔄 Ap redimare backend..."
docker-compose restart api

echo ""
echo "⏳ Ap tann 10 segonn pou backend initialize..."
sleep 10

echo ""
echo "📋 Backend logs (30 dènye liy):"
docker logs nala-api --tail 50 | grep -A 10 -B 10 "Database\|SuperAdmin\|Initialize" || docker logs nala-api --tail 30

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Verifikasyon itilizatè nan database:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

docker exec nala-postgres psql -U nalauser -d nalakreditimachann_db -c "
SELECT 
    \"Email\",
    \"FirstName\" || ' ' || \"LastName\" as \"Non\",
    CASE \"Role\" 
        WHEN 0 THEN 'SuperAdmin'
        ELSE 'Lòt'
    END as \"Wòl\",
    \"IsActive\"
FROM \"AspNetUsers\"
WHERE \"Role\" = 0
ORDER BY \"CreatedAt\" DESC
LIMIT 5;
"

ENDSSH

echo ""
echo "✅ Done!"
