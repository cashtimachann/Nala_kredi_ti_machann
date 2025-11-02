# 🔐 FIKSE LOGIN APRE CHANJMAN PORT

## 🎯 PWOBLÈM
Apre m chanje port la de 7001 → 5000 nan `.env`, login pa travay.

---

## 🔍 KÒZ LA
1. Backend la pa ap travay sou port 5000
2. Frontend la eseye konekte sou port 5000 men pa jwenn backend

---

## ✅ SOLISYON

### Etap 1: Relanse Backend sou Port 5000
```powershell
cd backend\NalaCreditAPI
dotnet run --launch-profile http
```

**Ou dwe wè:**
```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5000
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
```

### Etap 2: Verifye Backend Ap Travay
Ouvè yon lòt terminal epi teste:
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET
```

Si backend ap travay, w ap jwenn repons.

### Etap 3: Restart Frontend (TRE ENPÒTAN!)
Frontend la DWE restart pou li ka pran nouvo port lan!

**Nan terminal frontend:**
1. Peze `Ctrl+C` pou stop li
2. Tape:
```powershell
cd frontend-web
npm start
```

### Etap 4: Clear Browser Cache
Apre frontend restart, clear cache navigatè a:
- Peze `Ctrl+Shift+Delete`
- Oswa `Ctrl+F5` pou hard refresh

### Etap 5: Eseye Login Ankò
1. Ale sou http://localhost:3000
2. Login ak:
   - **Email**: admin@nalacredit.com
   - **Password**: Admin@2024!

---

## 🐛 SI LOGIN TOUJOU PA TRAVAY

### Tcheke 1: Backend ap travay?
```powershell
Test-NetConnection -ComputerName localhost -Port 5000
```
Dwe di: `TcpTestSucceeded : True`

### Tcheke 2: Frontend ap itilize bon port?
Ouvè konsol navigatè (F12), gade Network tab:
- Dwe wè: `POST http://localhost:5000/api/auth/login`
- PA: `POST http://localhost:7001/api/auth/login`

### Tcheke 3: CORS aktive nan backend?
Gade backend konsol, si ou wè:
```
Access to fetch at 'http://localhost:5000/...' has been blocked by CORS
```

**Solisyon**: Verifye `Program.cs` gen CORS pou localhost:3000

---

## 📋 CHECKLIST RAPID

- [ ] Backend ap travay sou port 5000
- [ ] Frontend restart apre chanjman .env
- [ ] Browser cache clear
- [ ] Login sou http://localhost:3000
- [ ] Console navigatè pa gen erè CORS

---

## 🎯 SI TOU BON

W ap ka login epi eseye kreye kliyan ankò! 🎉

---

**Kounye a**: Backend la ap lanse nan background. 
**Tan estimasyon**: 10-15 segond pou backend demarre.

Apre sa, restart frontend la epi eseye login!
