# 📋 Gid Kreyasyon Kont Administratè

## ✅ Règ Validasyon Backend (ENPÒTAN!)

### 1. 👤 Enfòmasyon Pèsonèl

#### **Non Konplè** (FirstName & LastName)
- ✅ **Obligatwa**
- ✅ 2-50 karaktè chak
- ❌ Pa ka vid

#### **Email**
- ✅ **Obligatwa**
- ✅ Fòma valid (example@domain.com)
- ✅ Maksimòm 100 karaktè
- ⚠️ Dwe inik (pa ka gen 2 kont ak menm email)

#### **Telefòn**
- ✅ **Obligatwa**
- ✅ **Fòma Ayisyen espesifik:**
  - `+509XXXXXXXX` (8 chif apre 509)
  - `509XXXXXXXX` (8 chif apre 509)
  - `XXXXXXXX` (jis 8 chif)
- ❌ **PA aksepte:**
  - Nimewo ak plis oswa mwens pase 8 chif
  - Karaktè espesyal lòt pase + nan kòmansman

**Egzanp Bon:**
```
+50937891234
50937891234
37891234
```

**Egzanp Move:**
```
37-89-12-34      ❌ (Tiret pa aksepte)
+509 3789 1234   ❌ (Espas pa aksepte nan backend)
123456           ❌ (Twò kout)
```

### 2. 💼 Enfòmasyon Pwofesyonèl

#### **Tip Administratè**
- ✅ **Obligatwa**
- Options:
  - SUPER_ADMIN
  - REGIONAL_MANAGER
  - BRANCH_MANAGER
  - CASHIER
  - LOAN_OFFICER
  - ACCOUNTANT
  - HR

#### **Depatman**
- ✅ **OBLIGATWA** (pa opsyonèl!)
- ✅ Maksimòm 100 karaktè
- ⚠️ Dwe chwazi youn nan lis la oswa ekri youn nouvo

#### **Succursale (Principale)**
- ⚠️ **Rekòmande** (pa obligatwa pou tout moun)
- ✅ Dwe egziste nan sistèm nan
- 💡 **Bon pratik:** Toujou asiye yon succursale prensipal

#### **Dat Anbouch**
- ✅ **Obligatwa**
- ✅ Fòma: YYYY-MM-DD

### 3. 🔐 Modpas

#### **Règ Estrik:**
- ✅ **Minimòm 8 karaktè**
- ✅ **Omwen 1 lèt majiskil** (A-Z)
- ✅ **Omwen 1 lèt miniskil** (a-z)
- ✅ **Omwen 1 chif** (0-9)
- ✅ **Omwen 1 karaktè espesyal** sèlman: `@$!%*?&`

**Egzanp Bon Modpas:**
```
Admin2025!       ✅
Password123@     ✅
MyPass$2024      ✅
Secure*Pass1     ✅
```

**Egzanp Move Modpas:**
```
password         ❌ (Pa gen majiskil, chif, oswa karaktè espesyal)
Password         ❌ (Pa gen chif oswa karaktè espesyal)
Password123      ❌ (Pa gen karaktè espesyal)
Pass123!         ❌ (Twò kout, mwens pase 8 karaktè)
Password#123     ❌ (# pa aksepte, sèlman @$!%*?&)
```

### 4. 🏢 Succursale Asiyen (Selon Tip)

#### **Pou REGIONAL_MANAGER (Manager Rejyonal):**
- ✅ **OBLIGATWA** - Omwen 1 succursale
- ✅ Ka chwazi plizyè succursale
- ⚠️ **SI w pa chwazi:** Erè validasyon ap parèt!

**Egzanp:**
```
✅ Port-au-Prince Centre
✅ Cap-Haïtien Nord  
✅ Les Cayes Sud
→ Total: 3 succursale chwazi ✅
```

#### **Pou Lòt Tip (CASHIER, LOAN_OFFICER, elatriye):**
- ⚠️ **Rekòmande** (pa obligatwa)
- ✅ Chwazi succursale prensipal kote itilizatè a ap travay
- 💡 **Bon pratik:** Toujou bay yon succursale

**Egzanp:**
```
Succursale Principale: Port-au-Prince Centre ✅
```

#### **Nòt Enpòtan:**
1. Si w chwazi **Succursale Principale** + **Succursales Assignées** (Manager Rejyonal):
   - Succursale prensipal la otomatikman ajoute nan lis la
   
2. Si w chwazi sèlman **Succursale Principale** (lòt tip):
   - Itilizatè a pral afekte nan succursale sa a

3. Si w pa chwazi okenn succursale (sof Manager Rejyonal):
   - Kont la pral kreye men san succursale prensipal
   - ⚠️ Pa rekòmande!

## 🎯 Etap pa Etap pou Kreye Kont

### Etap 1: Chwazi Tip Administratè
```
✅ Klike sou yon nan tip yo
✅ Asire w konprann responsabilite chak tip
```

### Etap 2: Ranpli Enfòmasyon Pèsonèl
```
✅ Non Konplè: Jean Pierre Dupont
✅ Email: jean.dupont@example.com
✅ Telefòn: +50937891234 oswa 37891234
```

### Etap 3: Enfòmasyon Pwofesyonèl
```
✅ Depatman: OBLIGATWA - Chwazi nan lis la
✅ Succursale: REKÒMANDE - Chwazi succursale prensipal
✅ Dat Anbouch: Chwazi dat la
⚠️ Si REGIONAL_MANAGER: Chwazi omwen 1 succursale nan seksyon "Succursales Assignées"
```

### Etap 4: Kreye Modpas
```
✅ Tape yon modpas ki respekte tout règ yo
✅ Konfime modpas la (dwe menm)
✅ Verifye tout kritè yo satisfè
```

### Etap 5: Revize epi Soumèt
```
✅ Verifye tout enfòmasyon yo
✅ Klike "Créer le Compte"
✅ Tann konfimasyon
```

## 🚨 Erè Komen ak Solisyon

### Erè: "One or more validation errors occurred"

**Koz Posib:**

1. **Telefòn pa valid**
   - ❌ Pwoblèm: `37-89-12-34`
   - ✅ Solisyon: `37891234` oswa `+50937891234`

2. **Depatman pa chwazi**
   - ❌ Pwoblèm: Kite vid
   - ✅ Solisyon: Chwazi yon depatman nan lis la

3. **Modpas pa gen karaktè espesyal**
   - ❌ Pwoblèm: `Password123`
   - ✅ Solisyon: `Password123!`

4. **Email deja egziste**
   - ❌ Pwoblèm: Email deja itilize
   - ✅ Solisyon: Itilize yon lòt email

5. **Manager Rejyonal san succursale**
   - ❌ Pwoblèm: Pa chwazi succursale pou REGIONAL_MANAGER
   - ✅ Solisyon: Chwazi omwen 1 succursale

## ✅ Chèk Lis Anvan Soumèt

```
☐ Non konplè ranpli (2+ karaktè chak pati)
☐ Email valid epi inik
☐ Telefòn 8 chif Ayisyen (509XXXXXXXX oswa XXXXXXXX)
☐ Depatman chwazi (OBLIGATWA!)
☐ Succursale prensipal chwazi (REKÒMANDE)
☐ Dat anbouch chwazi
☐ Modpas:
  ☐ 8+ karaktè
  ☐ 1+ majiskil
  ☐ 1+ miniskil
  ☐ 1+ chif
  ☐ 1+ karaktè espesyal (@$!%*?&)
☐ Modpas konfime matche
☐ Si REGIONAL_MANAGER: 1+ succursale chwazi nan "Succursales Assignées" (OBLIGATWA!)
```

## 💡 Konsèy Pwofesyonèl

1. **Telefòn:**
   - Antre sèlman chif yo, sistèm nan ap fòmate otomatikman
   - Egzanp: Tape `37891234`, sistèm nan aksepte sa

2. **Modpas:**
   - Itilize yon modpas solid tankou: `Admin2025!`
   - Pa itilize modpas twò senp tankou: `password`

3. **Depatman:**
   - Toujou chwazi youn, pa janm kite l vid!

4. **Email:**
   - Itilize email pwofesyonèl
   - Verifye li pa gen fot

## 🔄 Si w Toujou Gen Pwoblèm

1. **Verifye tout chan obligatwa** gen etwal wouj (*)
2. **Gade mesaj erè** - yo endike egzakteman pwoblèm nan
3. **Konsole Browser** - Peze F12 pou wè detay erè yo
4. **Tès telefòn** - Retire tout espas, tiret, parantèz

---

**Dènye Mizajou:** 17 Oktòb 2025  
**Vèsyon:** 2.0 - Ak règ validasyon backend detaye
