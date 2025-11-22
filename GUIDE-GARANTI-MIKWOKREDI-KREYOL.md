# Gestion Garanti Mikwokredi - Kijan li Fonksyone

## Rezime Rapid

Lè ou kreye yon aplikasyon mikwokredi, 15% nan montan prè a ap **bloke** nan kont depay kliyan an tankou garanti. Kòb sa a ap **debloke** nan ka sa yo:

## ✅ Ka kote Garanti yo Debloke Otomatikman

### 1. **Lè Aplikasyon an Rejte**
- **Statis**: `Rejected` 
- **Fonksyon**: `RejectApplicationAsync()`
- **Aksyon**: Kòb garanti a retounen imedyatman nan kont disponibl kliyan an

### 2. **Lè Aplikasyon an Anile**
- **Statis**: `Cancelled`
- **Fonksyon**: `CancelApplicationAsync()`
- **Aksyon**: Kòb garanti a debloke epi retounen nan kont disponibl

### 3. **Lè Prè a Fini Konplètman**
- **Statis**: `Completed` (lè `OutstandingBalance <= 0`)
- **Fonksyon**: `RecordPaymentAsync()`
- **Aksyon**: Lè dènye peman an fèt epi prè a konplètman peye, garanti a debloke otomatikman

### 4. **Lè Done yo Efase Manyèlman**
- **Script**: `clear-microcredit-data.sql` oswa `clear-microcredit-with-guarantee-unblock.sql`
- **Aksyon**: Anvan efase aplikasyon yo, script la debloke tout garanti ki te bloke

## ⚠️ Ka kote Garanti yo PA Debloke

### 1. **Lè Prè a Vin Defaulted (An Reta)**
- **Statis**: `Defaulted`
- **Fonksyon**: `MarkLoanAsDefaultedAsync()`
- **Rezon**: Garanti a rete bloke paske enstitisyon finansye a gen dwa itilize li pou kouvri pèt la
- **Solisyon**: Prè a ka rehabilite (`RehabilitateLoanAsync`) epi lè li konplètman peye, garanti a ap debloke

## 📊 Fòmil Garanti

```
Garanti (Bloke) = Montan Prè × 15%
```

**Egzanp:**
- Prè: 10,000 HTG
- Garanti: 10,000 × 15% = 1,500 HTG (bloke)
- Kont Disponibl avan: 8,000 HTG
- Kont Disponibl apre blokaj: 6,500 HTG
- Kont Bloke: 1,500 HTG

## 🔄 Pwosesis Konplè

### Kreye Aplikasyon
```
1. Verifye kont depay gen ase kòb (solde disponibl >= 15% prè a)
2. Si wi, bloke 15% nan kont la
3. Kreye aplikasyon ak statis "Draft"
```

### Soumèt Aplikasyon
```
1. Verifye dokiman yo konplè
2. Chanje statis an "Submitted"
3. Garanti rete bloke
```

### Apwouve Aplikasyon
```
1. Apwouve aplikasyon
2. Kreye prè ak statis "Approved"
3. Garanti rete bloke
```

### Dekese Prè
```
1. Dekese prè
2. Chanje statis an "Active"
3. Garanti rete bloke jiskaske prè a fini
```

### Fini Prè (Peye Konplètman)
```
1. Anrejistre dènye peman an
2. OutstandingBalance = 0
3. Chanje statis an "Completed"
4. DEBLOKE garanti a otomatikman ✅
```

## 🛠️ Script Mantennans

### Efase Done ak Deblokaj Garanti
Pou efase done test yo epi asire garanti yo debloke:

```powershell
# PowerShell
.\clear-microcredit-data.ps1
```

Oswa:

```sql
-- SQL dirèk
\i 'clear-microcredit-with-guarantee-unblock.sql'
```

## 📝 Verifye Garanti Bloke

Pou wè konbyen garanti ki bloke:

```sql
SELECT 
    COUNT(*) as applications_avec_garantie,
    SUM("BlockedGuaranteeAmount") as total_garanti_bloke
FROM microcredit_loan_applications 
WHERE "BlockedGuaranteeAmount" IS NOT NULL 
AND "BlockedSavingsAccountId" IS NOT NULL;
```

## 🔍 Chèk Kont Depay Bloke

Pou wè detay garanti pou yon kliyan:

```sql
SELECT 
    sa."AccountNumber",
    sa."AvailableBalance",
    sa."BlockedBalance",
    sa."Balance",
    mla."ApplicationNumber",
    mla."BlockedGuaranteeAmount",
    mla."Status"
FROM "SavingsAccounts" sa
INNER JOIN microcredit_loan_applications mla 
    ON sa."Id" = mla."BlockedSavingsAccountId"
WHERE mla."BlockedGuaranteeAmount" IS NOT NULL
ORDER BY sa."AccountNumber";
```

## ✅ Sekirite

1. **Tranzaksyon ACID**: Tout operasyon ak garanti fèt nan tranzaksyon pou asire konsistans
2. **Validasyon**: Sistèm la verifye kont la gen ase kòb avan bloke garanti
3. **Deblokaj Otomatik**: Pa bezwen entèvansyon manyèl - sistèm la jere deblokaj otomatikman
4. **Audit Trail**: Tout chanjman sou garanti yo anrejistre nan `UpdatedAt`

## 🚨 Pwoblem Komen epi Solisyon

### Pwoblem: Garanti pa debloke apre prè fini
**Solisyon**: Verifye si prè a gen statis "Completed" epi `OutstandingBalance = 0`

### Pwoblem: Pa ka kreye aplikasyon paske kont pa gen ase kòb
**Solisyon**: Asire kont depay la gen omwen 15% nan montan prè a disponib (pa bloke)

### Pwoblem: Garanti rete bloke apre efase aplikasyon
**Solisyon**: Itilize script `clear-microcredit-with-guarantee-unblock.sql` ki debloke garanti yo anvan efasaj

## 📚 Referans Kòd

- **Model**: `backend/NalaCreditAPI/Models/MicrocreditModels.cs`
- **Service**: `backend/NalaCreditAPI/Services/MicrocreditLoanApplicationService.cs`
- **Script Efasaj**: `clear-microcredit-data.sql`, `clear-microcredit-data.ps1`
- **Script Deblokaj**: `clear-microcredit-with-guarantee-unblock.sql`

---

**Dènye Mizajou**: 21 Nov 2025
**Vèsyon**: 1.0
