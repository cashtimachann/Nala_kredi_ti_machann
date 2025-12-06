#!/bin/bash

# 🔍 SCRIPT POU DEBUG RAPÒ BRANCH

echo "========================================="
echo "🔍 DEBUG RAPÒ BRANCH TRANSACTION"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check if backend is running
echo -e "${BLUE}[1/6] Tcheke si Backend la rounan...${NC}"
BACKEND_URL="https://localhost:5001"
BACKEND_URL_HTTP="http://localhost:5000"

if curl -k -s --max-time 5 "$BACKEND_URL/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend rounan sou HTTPS: $BACKEND_URL${NC}"
    API_URL=$BACKEND_URL
elif curl -s --max-time 5 "$BACKEND_URL_HTTP/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend rounan sou HTTP: $BACKEND_URL_HTTP${NC}"
    API_URL=$BACKEND_URL_HTTP
else
    echo -e "${RED}❌ Backend pa rounan!${NC}"
    echo -e "${YELLOW}   Solisyon: Rounan backend la:${NC}"
    echo "   cd backend/NalaCreditAPI"
    echo "   dotnet run"
    exit 1
fi

echo ""

# Step 2: Check if frontend is running
echo -e "${BLUE}[2/6] Tcheke si Frontend la rounan...${NC}"
if curl -s --max-time 5 "http://localhost:3000" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend rounan sou: http://localhost:3000${NC}"
else
    echo -e "${RED}❌ Frontend pa rounan!${NC}"
    echo -e "${YELLOW}   Solisyon: Rounan frontend la:${NC}"
    echo "   cd frontend-web"
    echo "   npm start"
    exit 1
fi

echo ""

# Step 3: Check .env file
echo -e "${BLUE}[3/6] Tcheke konfigirasyon .env...${NC}"
ENV_FILE="frontend-web/.env"

if [ -f "$ENV_FILE" ]; then
    echo -e "${GREEN}✅ .env file egziste${NC}"
    
    if grep -q "REACT_APP_API_URL" "$ENV_FILE"; then
        API_URL_CONFIG=$(grep "REACT_APP_API_URL" "$ENV_FILE" | cut -d '=' -f2)
        echo -e "${GREEN}   REACT_APP_API_URL=$API_URL_CONFIG${NC}"
    else
        echo -e "${RED}❌ REACT_APP_API_URL pa konfigire nan .env${NC}"
        echo -e "${YELLOW}   Solisyon: Ajoute liy sa nan $ENV_FILE:${NC}"
        echo "   REACT_APP_API_URL=$API_URL/api"
    fi
else
    echo -e "${RED}❌ .env file pa egziste${NC}"
    echo -e "${YELLOW}   Solisyon: Kreye fichye $ENV_FILE ak kontni sa:${NC}"
    echo "   REACT_APP_API_URL=$API_URL/api"
fi

echo ""

# Step 4: Check database connection
echo -e "${BLUE}[4/6] Tcheke koneksyon database...${NC}"
echo -e "${YELLOW}⚠️  Pou tcheke database, ou dwe konekte manuèlman${NC}"
echo "   Egzanp pou PostgreSQL:"
echo "   psql -U postgres -d NalaCredit -c \"SELECT COUNT(*) FROM \\\"Branches\\\";\""
echo ""
echo "   Egzanp pou SQL Server:"
echo "   sqlcmd -S localhost -d NalaCredit -Q \"SELECT COUNT(*) FROM Branches\""

echo ""

# Step 5: Test API endpoints
echo -e "${BLUE}[5/6] Test API Endpoints...${NC}"
echo -e "${YELLOW}⚠️  Ou bezwen yon token JWT pou test sa${NC}"
echo ""
echo "   Pou jwenn token ou:"
echo "   1. Louvè browser DevTools (F12)"
echo "   2. Console > tape: localStorage.getItem('token')"
echo "   3. Kopi token an"
echo ""
echo "   Epi roulan komand sa ak token ou:"
echo ""
echo -e "${GREEN}   # Test my-branch daily report:${NC}"
echo "   curl -X GET \"$API_URL/api/BranchReport/my-branch/daily\" \\"
echo "     -H \"Authorization: Bearer [YOUR_TOKEN]\" \\"
echo "     -k"
echo ""
echo -e "${GREEN}   # Test specific branch daily report (branch 1):${NC}"
echo "   curl -X GET \"$API_URL/api/BranchReport/daily/1?date=2025-12-06\" \\"
echo "     -H \"Authorization: Bearer [YOUR_TOKEN]\" \\"
echo "     -k"

echo ""

# Step 6: Check common issues
echo -e "${BLUE}[6/6] Tcheke pwoblèm komen yo...${NC}"

echo -e "${YELLOW}📋 Checklist:${NC}"
echo "   □ Backend rounan? $(if curl -k -s --max-time 2 "$API_URL/api/health" > /dev/null 2>&1; then echo -e "${GREEN}✅${NC}"; else echo -e "${RED}❌${NC}"; fi)"
echo "   □ Frontend rounan? $(if curl -s --max-time 2 "http://localhost:3000" > /dev/null 2>&1; then echo -e "${GREEN}✅${NC}"; else echo -e "${RED}❌${NC}"; fi)"
echo "   □ .env konfigire? $(if [ -f "$ENV_FILE" ] && grep -q "REACT_APP_API_URL" "$ENV_FILE"; then echo -e "${GREEN}✅${NC}"; else echo -e "${RED}❌${NC}"; fi)"
echo "   □ Token JWT valid? ${YELLOW}⚠️  Verifye manuèlman${NC}"
echo "   □ User gen bon role? ${YELLOW}⚠️  Verifye manuèlman${NC}"
echo "   □ User gen branchId? ${YELLOW}⚠️  Verifye manuèlman${NC}"

echo ""

# Summary
echo "========================================="
echo -e "${GREEN}✅ VERIFIKASYON KONPLÈ${NC}"
echo "========================================="
echo ""
echo -e "${BLUE}Etap Suivan yo:${NC}"
echo "1. Si backend/frontend pa rounan, demawe yo"
echo "2. Konekte nan aplikasyon an ak yon kont valid"
echo "3. Ale sou http://localhost:3000/reports/branch"
echo "4. Ouvè DevTools (F12) pou wè erè yo"
echo "5. Gade Network tab pou wè request/response"
echo ""
echo -e "${YELLOW}📖 Pou plis detay, gade: ANALIZ-RAPÒ-BRANCH-PWOBLÈM.md${NC}"
echo ""
