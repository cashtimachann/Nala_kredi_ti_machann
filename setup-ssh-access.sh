#!/bin/bash

# Script d'aide pour configurer l'accès SSH à Digital Ocean
# Nala Credit Ti Machann - Configuration SSH

echo "🔑 Configuration SSH pour Digital Ocean - Nala Credit Ti Machann"
echo "================================================================"

echo ""
echo "📋 ÉTAPES À SUIVRE:"
echo ""

echo "1️⃣  COPIER VOTRE CLÉ PUBLIQUE:"
echo "   Copiez cette clé dans votre presse-papiers :"
echo ""
cat ~/.ssh/nala_deployment_rsa.pub
echo ""

echo "2️⃣  AJOUTER LA CLÉ DANS DIGITAL OCEAN:"
echo "   a) Connectez-vous à https://cloud.digitalocean.com"
echo "   b) Allez dans Settings → Security → SSH Keys"
echo "   c) Cliquez sur 'Add SSH Key'"
echo "   d) Collez la clé ci-dessus"
echo "   e) Donnez-lui un nom: 'Nala Credit Deployment'"
echo "   f) Cliquez 'Add SSH Key'"
echo ""

echo "3️⃣  ASSOCIER LA CLÉ À VOTRE DROPLET:"
echo "   a) Allez dans Droplets → Votre droplet (142.93.78.111)"
echo "   b) Onglet 'Settings' → 'SSH Keys'"
echo "   c) Cliquez 'Edit' et ajoutez la clé 'Nala Credit Deployment'"
echo "   d) Sauvegardez les changements"
echo ""

echo "4️⃣  ALTERNATIVE - CONSOLE WEB:"
echo "   Si vous préférez utiliser la console web :"
echo "   a) Allez dans votre droplet → Console (bouton 'Console')"
echo "   b) Connectez-vous en tant que root"
echo "   c) Exécutez ces commandes :"
echo ""
echo "   mkdir -p ~/.ssh"
echo "   echo '$(cat ~/.ssh/nala_deployment_rsa.pub)' >> ~/.ssh/authorized_keys"
echo "   chmod 600 ~/.ssh/authorized_keys"
echo "   chmod 700 ~/.ssh"
echo ""

echo "5️⃣  TESTER LA CONNEXION:"
echo "   Une fois configuré, testez avec :"
echo "   ssh root@142.93.78.111"
echo "   ou"
echo "   ssh nala-do"
echo ""

echo "⚡ DÉPLOIEMENT RAPIDE APRÈS CONFIGURATION SSH:"
echo "   ./docker-deploy.sh production deploy"
echo ""

# Fonction pour tester la connexion
test_connection() {
    echo "🧪 Test de connexion SSH..."
    if ssh -o ConnectTimeout=5 -o BatchMode=yes root@142.93.78.111 exit 2>/dev/null; then
        echo "✅ Connexion SSH réussie !"
        return 0
    else
        echo "❌ Connexion SSH échouée - Configurez d'abord la clé dans Digital Ocean"
        return 1
    fi
}

# Demander si l'utilisateur veut tester
echo ""
read -p "🔄 Voulez-vous tester la connexion SSH maintenant ? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    test_connection
    
    if [ $? -eq 0 ]; then
        echo ""
        read -p "🚀 Voulez-vous procéder au déploiement maintenant ? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🎯 Lancement du déploiement..."
            ./docker-deploy.sh production deploy
        fi
    fi
fi

echo ""
echo "📖 Pour plus d'aide, consultez le guide: GUIDE-DOCKER-DEPLOIEMENT.md"