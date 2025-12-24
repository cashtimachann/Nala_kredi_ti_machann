# Nala Credit Desktop App v1.0.5

## 🚀 Nouvèl Vèsyon: 1.0.5
**Dat**: 24 Desanm 2025

---

## 🔧 Chanjman Enpòtan

### ✅ Koreksyon Kritik
- **Domain Branch**: Desktop app la kounye a itilize `branch.nalakreditimachann.com` pou kesye yo
- **Login Fix**: Rezoud pwoblèm validasyon domain ki te anpeche kesye yo konekte
- **Role Detection**: Amelyore deteksyon wòl ak navigasyon otomatik

---

## 📥 Enstalasyon

### Nouvo Enstalasyon
1. Telechaje `NalaCreditDesktop.exe`
2. Telechaje `appsettings.json`  
3. Mete 2 fichye yo nan menm folder
4. Egzekite `NalaCreditDesktop.exe`

### Mi-a-jou depi v1.0.4
1. Fèmen aplikasyon ki louvri a
2. Ranplase `NalaCreditDesktop.exe` ak nouvo vèsyon an
3. Ranplase `appsettings.json` ak nouvo fichye a
4. Re-louvri aplikasyon an

---

## ⚙️ Konfigirasyon

### appsettings.json
```json
{
  "AppSettings": {
    "Version": "1.0.5",
    "ApplicationName": "Nala Kredi Desktop",
    "Environment": "Production"
  },
  "ApiSettings": {
    "BaseUrl": "https://branch.nalakreditimachann.com/api",
    "Timeout": 30,
    "RetryAttempts": 3,
    "RetryDelay": 2
  }
}
```

---

## 🎯 Kont Itilizatè yo

### Kesye (Cashier)
- **Domain**: `branch.nalakreditimachann.com`
- **Aksè**: Dashboard Kesye, Tranzaksyon, Rapò Jounen

### Manager (Chef de Succursale)  
- **Domain**: `branch.nalakreditimachann.com`
- **Aksè**: Dashboard Manager, Estatistik Branch, Validasyon

### Admin/SuperAdmin
- **Domain**: `admin.nalakreditimachann.com`  
- **Aksè**: Panel Administrasyon, Tout Branch yo

---

## 🔒 Sekirite Domain

Sistèm nan enfòse validasyon domain:
- ✅ Kesye/Manager → DOGE sèlman itilize `branch.nalakreditimachann.com`
- ✅ Admin/SuperAdmin → DWE sèlman itilize `admin.nalakreditimachann.com`
- ❌ Si ou eseye login sou move domain, aksè ap bloke

---

## 📝 Changelog Konplè

### v1.0.5 (2025-12-24)
- ✅ Fix: BaseUrl change de admin → branch domain
- ✅ Fix: Login domain validation working correctly
- ✅ Fix: Role-based navigation to correct dashboard

### v1.0.4 (Previous)
- Role detection improvements
- Dashboard enhancements
- Bug fixes

---

## ❓ Pwoblèm yo Rezoud

### ❌ "Pa ka login" (Fixed!)
**Pwoblèm**: Kesye yo pa ka login  
**Koz**: Desktop app te konfigure pou admin domain  
**Solisyon**: Change BaseUrl → branch domain

### ✅ Validasyon Domain
- Backend middleware valide si w ap itilize bon domain
- Mesaj klè si w nan move domain

---

## 🆘 Sipò

Si ou rankontre pwoblèm:
1. Verifye `appsettings.json` gen bon konfigirasyon
2. Verifye koneksyon entènèt ou
3. Verifye ou gen bon pwofil itilizatè (Cashier, Manager, etc.)
4. Kontakte sipò teknik

---

## 📦 Fichye Enpòtan

```
📁 NalaCreditDesktop-v1.0.5/
├── NalaCreditDesktop.exe (4.3 MB)
├── appsettings.json (660 bytes)
├── version.json (Auto-update info)
└── README.md (Sa dokiman sa a)
```

---

## 🌐 Domèn yo

- **Branch Portal**: https://branch.nalakreditimachann.com
- **Admin Portal**: https://admin.nalakreditimachann.com
- **API**: `/api` (backend endpoints)

---

**© 2025 Nala Kredi Ti Machann**
