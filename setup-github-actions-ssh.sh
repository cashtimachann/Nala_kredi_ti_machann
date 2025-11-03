#!/bin/bash

# ============================================
# Setup GitHub Actions SSH Key
# ============================================

set -e

SERVER_IP="142.93.78.111"
KEY_NAME="github_actions_deploy"
KEY_PATH="$HOME/.ssh/$KEY_NAME"

echo "🔐 Setting up GitHub Actions SSH Key"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if key already exists
if [ -f "$KEY_PATH" ]; then
    echo "⚠️  SSH key already exists at: $KEY_PATH"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted"
        exit 1
    fi
    rm -f "$KEY_PATH" "$KEY_PATH.pub"
fi

echo "1️⃣  Creating SSH key..."
ssh-keygen -t ed25519 \
    -C "github-actions@nalakreditimachann.com" \
    -f "$KEY_PATH" \
    -N ""

echo ""
echo "✅ SSH key created!"
echo "   Private key: $KEY_PATH"
echo "   Public key:  $KEY_PATH.pub"
echo ""

echo "2️⃣  Adding public key to server..."
if ssh-copy-id -i "$KEY_PATH.pub" root@$SERVER_IP; then
    echo "✅ Public key added to server!"
else
    echo "❌ Failed to add public key to server"
    echo ""
    echo "Try manually:"
    echo "  cat $KEY_PATH.pub | ssh root@$SERVER_IP 'cat >> ~/.ssh/authorized_keys'"
    exit 1
fi

echo ""
echo "3️⃣  Testing SSH connection..."
if ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no root@$SERVER_IP 'echo "SSH connection works!"'; then
    echo "✅ SSH connection successful!"
else
    echo "❌ SSH connection failed!"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Copy the private key for GitHub Secret:"
echo "   cat $KEY_PATH"
echo ""
echo "2. Go to GitHub:"
echo "   https://github.com/cashtimachann/Nala_kredi_ti_machann/settings/secrets/actions"
echo ""
echo "3. Click 'New repository secret'"
echo "   Name: SSH_PRIVATE_KEY"
echo "   Value: (paste the output from step 1)"
echo ""
echo "4. Save and you're done!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Press Enter to view the private key (copy it for GitHub)..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PRIVATE KEY (copy everything below):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$KEY_PATH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT: This private key is displayed ONCE."
echo "   Copy it now and paste it into GitHub Secrets!"
echo ""
