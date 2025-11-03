#!/bin/bash

# ============================================
# Verify SSH Private Key Format for GitHub
# ============================================

KEY_PATH="$HOME/.ssh/github_actions_deploy"

echo "🔍 Verifying SSH Private Key Format"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ! -f "$KEY_PATH" ]; then
    echo "❌ Private key not found at: $KEY_PATH"
    echo ""
    echo "Run this first:"
    echo "  ./setup-github-actions-ssh.sh"
    exit 1
fi

echo "📋 Key file: $KEY_PATH"
echo ""

# Check key format
echo "1️⃣  Checking key format..."
FIRST_LINE=$(head -n 1 "$KEY_PATH")

if [[ "$FIRST_LINE" == "-----BEGIN OPENSSH PRIVATE KEY-----" ]]; then
    echo "✅ Format: OpenSSH (correct)"
elif [[ "$FIRST_LINE" == "-----BEGIN RSA PRIVATE KEY-----" ]]; then
    echo "✅ Format: RSA (compatible)"
elif [[ "$FIRST_LINE" == "-----BEGIN EC PRIVATE KEY-----" ]]; then
    echo "✅ Format: EC (compatible)"
else
    echo "❌ Unknown format!"
    echo "   First line: $FIRST_LINE"
    exit 1
fi

echo ""
echo "2️⃣  Checking key integrity..."
if ssh-keygen -l -f "$KEY_PATH" > /dev/null 2>&1; then
    echo "✅ Key is valid"
    ssh-keygen -l -f "$KEY_PATH"
else
    echo "❌ Key is corrupted or invalid"
    exit 1
fi

echo ""
echo "3️⃣  Testing local SSH connection..."
if ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no -o ConnectTimeout=5 root@142.93.78.111 'echo "Connection works!"' 2>/dev/null; then
    echo "✅ SSH connection successful"
else
    echo "❌ SSH connection failed"
    echo "   Check if public key is installed on server"
    exit 1
fi

echo ""
echo "4️⃣  Checking for newlines and special characters..."
KEY_CONTENT=$(cat "$KEY_PATH")
if [[ "$KEY_CONTENT" =~ [[:cntrl:]] ]] && [[ ! "$KEY_CONTENT" =~ $'\n' ]]; then
    echo "⚠️  Warning: Key might have unusual characters"
else
    echo "✅ Key looks clean"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ SSH Key Verification Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 For GitHub Secret, copy EXACTLY:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$KEY_PATH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT:"
echo "   - Copy ENTIRE content including BEGIN/END lines"
echo "   - Do NOT add extra spaces or newlines"
echo "   - Paste directly into GitHub Secret value"
echo ""
echo "🔗 GitHub Secrets URL:"
echo "   https://github.com/cashtimachann/Nala_kredi_ti_machann/settings/secrets/actions"
echo ""
