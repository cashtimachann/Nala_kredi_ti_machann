#!/bin/bash

SSH_KEY="$HOME/.ssh/nala_deployment_rsa"
SERVER_IP="142.93.78.111"

echo "🔍 Ap jwenn konfigirasyon database..."
echo ""

ssh -i "$SSH_KEY" root@$SERVER_IP << 'ENDSSH'

cd /var/www/nala-credit

echo "📄 Docker compose environment variables:"
if [ -f ".env" ]; then
    grep -E "POSTGRES_|DB_" .env || echo "Pa jwenn variable database"
else
    echo "❌ .env file pa egziste"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🔍 Ap teste koneksyon database dirèkteman:"
docker exec nala-postgres psql --version

echo ""
echo "🔍 Ap liste database yo:"
docker exec nala-postgres psql -U nalauser -l || docker exec nala-postgres psql -U postgres -l

echo ""
echo "🔍 Ap jwenn users nan database:"
docker exec nala-postgres psql -U nalauser -d nalakreditimachann_db -c "SELECT 'Connected!' as status;" || \
docker exec nala-postgres psql -U postgres -d nalakreditimachann_db -c "SELECT 'Connected!' as status;"

ENDSSH
