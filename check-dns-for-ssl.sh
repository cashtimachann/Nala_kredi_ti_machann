#!/bin/bash

# ============================================
# Check DNS Configuration for SSL Installation
# ============================================

DOMAIN="admin.nalakreditimachann.com"
EXPECTED_IP="142.93.78.111"

echo "🔍 Checking DNS for $DOMAIN"
echo "Expected IP: $EXPECTED_IP"
echo ""

# Get all IPs
IPS=$(dig +short $DOMAIN | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$')

if [[ -z "$IPS" ]]; then
    echo "❌ No DNS records found!"
    echo "   Please configure DNS on GoDaddy"
    exit 1
fi

# Count IPs
IP_COUNT=$(echo "$IPS" | wc -l | tr -d ' ')

echo "Found $IP_COUNT IP address(es):"
echo "$IPS" | while read ip; do
    if [[ "$ip" == "$EXPECTED_IP" ]]; then
        echo "  ✅ $ip (correct)"
    else
        echo "  ❌ $ip (should be removed)"
    fi
done
echo ""

# Check if ready for SSL
if [[ "$IP_COUNT" -eq 1 ]] && [[ "$IPS" == "$EXPECTED_IP" ]]; then
    echo "✅ DNS is configured correctly!"
    echo ""
    echo "🔒 Ready to install SSL. Run:"
    echo "   ./install-letsencrypt-ssl.sh $DOMAIN your@email.com"
    echo ""
    exit 0
elif echo "$IPS" | grep -q "$EXPECTED_IP"; then
    echo "⚠️  DNS has multiple IPs. Please remove the incorrect ones from GoDaddy."
    echo ""
    echo "Steps:"
    echo "1. Go to: https://dcc.godaddy.com/"
    echo "2. Select domain: nalakreditimachann.com"
    echo "3. Go to DNS settings"
    echo "4. Remove any A record for 'admin' that is NOT $EXPECTED_IP"
    echo "5. Wait 5-10 minutes for DNS propagation"
    echo "6. Run this script again"
    echo ""
    echo "See: FIX-GODADDY-DNS-DUAL-IP.md for detailed instructions"
    exit 1
else
    echo "❌ DNS is pointing to wrong IP!"
    echo ""
    echo "Please update DNS on GoDaddy to point to: $EXPECTED_IP"
    exit 1
fi
