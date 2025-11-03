#!/bin/bash

# 🔧 Convert SSH Key to Base64 for GitHub Secret
# This solves newline/formatting issues

echo "🔐 Converting SSH private key to base64..."
echo ""

# Check if key exists
if [ ! -f ~/.ssh/github_actions_deploy ]; then
    echo "❌ Error: SSH key not found at ~/.ssh/github_actions_deploy"
    echo "Run ./setup-github-actions-ssh.sh first!"
    exit 1
fi

# Encode to base64
BASE64_KEY=$(cat ~/.ssh/github_actions_deploy | base64)

echo "✅ Key converted to base64!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "COPY THIS BASE64 STRING TO GITHUB SECRET:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "$BASE64_KEY"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Steps:"
echo "1. Go to: https://github.com/cashtimachann/Nala_kredi_ti_machann/settings/secrets/actions"
echo "2. Click: 'New repository secret'"
echo "3. Name: SSH_PRIVATE_KEY_BASE64"
echo "4. Value: Paste the base64 string above (one long line)"
echo "5. Click: 'Add secret'"
echo ""
echo "Then update .github/workflows/deploy.yml to decode it."
echo ""
