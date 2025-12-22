#!/bin/bash

SSH_KEY="$HOME/.ssh/nala_deployment_rsa"
SERVER_IP="142.93.78.111"

echo "🚀 Ap deplwaye ak egzekite CreateSuperAdmin tool sou sèvè..."
echo ""

# Kòpye tool la sou sèvè a
echo "📦 Ap kòpye tool la..."
scp -i "$SSH_KEY" /Users/herlytache/Nala_kredi_ti_machann/Tools/CreateSuperAdminProgram.cs root@$SERVER_IP:/tmp/
scp -i "$SSH_KEY" /Users/herlytache/Nala_kredi_ti_machann/Tools/CreateSuperAdmin.csproj root@$SERVER_IP:/tmp/

echo "🔧 Ap egzekite tool la sou sèvè..."
ssh -i "$SSH_KEY" root@$SERVER_IP << 'ENDSSH'

# Update connection string in the program
cd /tmp

# Modifye connection string pou konekte ak container
sed -i 's/Host=localhost/Host=nala-postgres/g' CreateSuperAdminProgram.cs
sed -i 's/Username=postgres/Username=nalauser/g' CreateSuperAdminProgram.cs
sed -i 's/Password=JCS823ch!!/Password=Nala_kredi823@@!!/g' CreateSuperAdminProgram.cs

# Egzekite tool la nan container backend la ki gen SDK
echo "Ap egzekite nan container backend..."
docker exec nala-api sh -c '
    cd /tmp
    # Kòpye fichye yo
    if [ ! -d /tmp/SuperAdminTool ]; then
        mkdir -p /tmp/SuperAdminTool
    fi
'

docker cp /tmp/CreateSuperAdminProgram.cs nala-api:/tmp/SuperAdminTool/Program.cs
docker cp /tmp/CreateSuperAdmin.csproj nala-api:/tmp/SuperAdminTool/CreateSuperAdmin.csproj

docker exec nala-api sh -c '
    cd /tmp/SuperAdminTool
    # Update connection string again
    sed -i "s/Host=localhost/Host=nala-postgres/g" Program.cs
    sed -i "s/Username=postgres/Username=nalauser/g" Program.cs
    sed -i "s/Password=JCS823ch!!/Password=Nala_kredi823@@!!/g" Program.cs
    
    # Egzekite
    dotnet run --project CreateSuperAdmin.csproj
'

ENDSSH

echo ""
echo "✅ Done! Ann teste login kounye a!"
