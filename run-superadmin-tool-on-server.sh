#!/bin/bash

SSH_KEY="$HOME/.ssh/nala_deployment_rsa"
SERVER_IP="142.93.78.111"

echo "🚀 Ap kòpye ak egzekite tool SuperAdmin sou sèvè..."
echo ""

# Kòpye fichye yo
scp -i "$SSH_KEY" /Users/herlytache/Nala_kredi_ti_machann/Tools/CreateSuperAdminProgram.cs root@$SERVER_IP:/root/
scp -i "$SSH_KEY" /Users/herlytache/Nala_kredi_ti_machann/Tools/CreateSuperAdmin.csproj root@$SERVER_IP:/root/

ssh -i "$SSH_KEY" root@$SERVER_IP << 'ENDSSH'

cd /root

# Update connection string
sed -i 's/Host=localhost/Host=nala-postgres/g' CreateSuperAdminProgram.cs
sed -i 's/Username=postgres/Username=nalauser/g' CreateSuperAdminProgram.cs
sed -i 's/Password=JCS823ch!!/Password=Nala_kredi823@@!!/g' CreateSuperAdminProgram.cs

# Enstale .NET SDK si li pa la
if ! command -v dotnet &> /dev/null; then
    echo "📦 Ap enstale .NET SDK..."
    wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh
    chmod +x dotnet-install.sh
    ./dotnet-install.sh --channel 8.0
    export DOTNET_ROOT=$HOME/.dotnet
    export PATH=$PATH:$DOTNET_ROOT:$DOTNET_ROOT/tools
fi

# Egzekite tool la
echo ""
echo "🔧 Ap egzekite tool la..."
$HOME/.dotnet/dotnet run --project CreateSuperAdmin.csproj 2>&1 | grep -v "warning"

ENDSSH

echo ""
echo "✅ Done! Teste login kounye a!"
