# GID KONPLE - RAPÒ PA SIKISYAL

## Apèsi Jeneral

Sistèm rapò pa sikisyal la pèmèt manadjè yo suiv tout aktivite finansye sikisyal yo an tan reyèl. Rapò yo enkli kredi ki bay, peman ki resevwa, depo, retrè, balans kès ak transfè ant sikisyal.

---

## Endpoints API

### 1. Rapò Jounen - Sikisyal Mwen

**GET** `/api/BranchReport/my-branch/daily`

Pèmèt manadjè konekte a wè rapò sikisyal pa li.

**Paramèt:**
- `date` (opsyonèl): Dat rapò a (fòma: YYYY-MM-DD)
  - Pa defo: jodi a

**Wòl otorize:** Manager, BranchSupervisor, Cashier

**Egzanp demann:**
```bash
GET /api/BranchReport/my-branch/daily?date=2025-12-02
Authorization: Bearer {token}
```

---

### 2. Rapò Jounen - Pa ID Sikisyal

**GET** `/api/BranchReport/daily/{branchId}`

Pou administratè ki vle gade rapò yon sikisyal espesifik.

**Paramèt:**
- `branchId` (obligatwa): ID sikisyal la
- `date` (opsyonèl): Dat rapò a

**Wòl otorize:** Manager, BranchSupervisor, SuperAdmin, Director

**Egzanp:**
```bash
GET /api/BranchReport/daily/1?date=2025-12-02
Authorization: Bearer {token}
```

---

### 3. Rapò Mwayan - Sikisyal Mwen

**GET** `/api/BranchReport/my-branch/monthly`

Jenere yon rapò mwayan konplè ak tout rapò jounen yo ak estatistik agregè.

**Paramèt:**
- `month` (opsyonèl): Mwa (1-12, pa defo: mwa aktyèl)
- `year` (opsyonèl): Ane (pa defo: ane aktyèl)

**Wòl otorize:** Manager, BranchSupervisor

**Egzanp:**
```bash
GET /api/BranchReport/my-branch/monthly?month=11&year=2025
Authorization: Bearer {token}
```

---

### 4. Rapò Mwayan - Pa ID Sikisyal

**GET** `/api/BranchReport/monthly/{branchId}`

**Paramèt:**
- `branchId` (obligatwa): ID sikisyal la
- `month` (opsyonèl): Mwa (1-12)
- `year` (opsyonèl): Ane

**Wòl otorize:** Manager, BranchSupervisor, SuperAdmin, Director

**Egzanp:**
```bash
GET /api/BranchReport/monthly/1?month=11&year=2025
Authorization: Bearer {token}
```

---

### 5. Rapò Pèsonalize

**POST** `/api/BranchReport/custom`

Jenere yon rapò pou yon peryòd pèsonalize.

**Wòl otorize:** Manager, BranchSupervisor, SuperAdmin, Director

**Kò demann lan:**
```json
{
  "branchId": 1,
  "startDate": "2025-11-15T00:00:00Z",
  "endDate": "2025-11-30T23:59:59Z",
  "includeDetails": true
}
```

---

### 6. Konparezon Pèfòmans ant Sikisyal

**GET** `/api/BranchReport/performance-comparison`

Konpare pèfòmans tout sikisyal yo ak klasman.

**Paramèt:**
- `startDate` (opsyonèl): Dat kòmansman (pa defo: 1 mwa pa de)
- `endDate` (opsyonèl): Dat fen (pa defo: jodi a)

**Wòl otorize:** SuperAdmin, Director

**Egzanp:**
```bash
GET /api/BranchReport/performance-comparison?startDate=2025-11-01&endDate=2025-11-30
Authorization: Bearer {token}
```

---

### 7. Ekspòte CSV

**GET** `/api/BranchReport/export/daily/{branchId}`

Ekspòte yon rapò jounen nan fòma CSV.

**Paramèt:**
- `branchId` (obligatwa): ID sikisyal la
- `date` (opsyonèl): Dat rapò a

**Wòl otorize:** Manager, BranchSupervisor, SuperAdmin, Director

**Egzanp:**
```bash
GET /api/BranchReport/export/daily/1?date=2025-12-02
Authorization: Bearer {token}
```

---

## Metrik ki Kalkile

### 1. Balans Kès

Balans kès la kalkile lè w ajoute tout sesyon kès jounen an:

```
Balans louvèti = Total balans louvèti tout sesyon yo
Balans fèmti = Total balans fèmti tout sesyon yo
Chanjman nèt = Balans fèmti - Balans louvèti
```

### 2. Pòtfòy an Risk (PAR)

Pousantaj pòtfòy la ki an sitiyasyon risk:

```
PAR = (Balans prè an reta > 30 jou / Total balans pòtfòy la) × 100
```

Yon PAR ki mwens pase 5% se ekselan.
Ant 5% ak 10% se akseptab.
Pi wo pase 10% bezwen aksyon imedya.

### 3. To Rekipyerasyon

Pousantaj peman ki atann yo ke yo te reyèlman kolekte:

```
To rekipyerasyon = (Peman resevwa / Peman atann) × 100
```

Yon to ki pi wo pase 95% se ekselan.

---

## Itilizasyon Pratik

### Rapò Maten (Chèf Sikisyal)

Chak maten, chèf sikisyal la ta dwe:

1. **Gade rapò lavèy la:**
```bash
GET /api/BranchReport/my-branch/daily?date=2025-12-01
```

2. **Verifye endikatè kle yo:**
   - Kantite kredi ki bay
   - Total koleksyon yo
   - Balans kès
   - Kantite tranzaksyon

3. **Idantifye anomali yo:**
   - Diferans enpòtan nan balans kès
   - To rekipyerasyon anòmalman ba
   - Kantite tranzaksyon pa nòmal

---

## Endikatè Pèfòmans (KPI)

Rapò yo enkli otomatikman KPI sa yo:

### KPI Operasyonèl
- **Kantite tranzaksyon pa jou**
- **Montan mwayèn tranzaksyon yo**
- **Kantite sesyon kès aktif**
- **To itilizasyon kès la**

### KPI Kredi
- **Kantite kredi ki bay**
- **Montan mwayèn kredi yo**
- **To rekipyerasyon**
- **Pòtfòy an Risk (PAR)**
- **Kantite prè aktif**

### KPI Kliyantel
- **Nouvo kliyann yo**
- **Total kliyann aktif**
- **To retansyon**

### KPI Finansye
- **Total depo yo**
- **Total retrè yo**
- **Chanjman nèt kès**
- **Transfè ant sikisyal (ki antre/ki soti)**

---

## Sekirite ak Otorizasyon

### Nivo Aksè

| Wòl | Rapò Jounen (Sikisyal Mwen) | Rapò Mwayan (Sikisyal Mwen) | Rapò Lòt Sikisyal | Konparezon Pèfòmans |
|------|----------------------------|----------------------------|------------------|---------------------|
| **Cashier** | ✅ Lekti | ❌ | ❌ | ❌ |
| **Manager** | ✅ Lekti | ✅ Lekti | ✅ Lekti | ❌ |
| **BranchSupervisor** | ✅ Lekti | ✅ Lekti | ✅ Lekti | ❌ |
| **SuperAdmin** | ✅ Lekti | ✅ Lekti | ✅ Lekti | ✅ Lekti |
| **Director** | ✅ Lekti | ✅ Lekti | ✅ Lekti | ✅ Lekti |

---

## Egzanp Entegrasyon

### Frontend React/Vue

```javascript
// Jwenn rapò jounen an
async function getDailyReport(date = null) {
  const dateParam = date ? `?date=${date}` : '';
  const response = await fetch(
    `/api/BranchReport/my-branch/daily${dateParam}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return await response.json();
}

// Afiche rapò a
const report = await getDailyReport('2025-12-02');
console.log(`Kredi ki bay: ${report.creditsDisbursedCount}`);
console.log(`Total HTG: ${report.totalCreditsDisbursedHTG}`);
console.log(`Total USD: ${report.totalCreditsDisbursedUSD}`);
```

### Desktop C# (WPF/WinForms)

```csharp
public class BranchReportService
{
    private readonly HttpClient _httpClient;
    
    public async Task<DailyBranchReportDto> GetDailyReportAsync(DateTime? date = null)
    {
        var dateParam = date.HasValue ? $"?date={date:yyyy-MM-dd}" : "";
        var response = await _httpClient.GetAsync(
            $"/api/BranchReport/my-branch/daily{dateParam}"
        );
        
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsAsync<DailyBranchReportDto>();
    }
}
```

---

## Rezoud Pwoblèm

### Pwoblèm: Rapò vid

**Koz posib:** Pa gen tranzaksyon pou peryòd la

**Solisyon:** Verifye ke te gen aktivite pou dat la

### Pwoblèm: Erè 404

**Koz posib:** Sikisyal pa egziste

**Solisyon:** Verifye ID sikisyal la

### Pwoblèm: Erè 401/403

**Koz posib:** Token ekspire oswa pèmisyon pa sifi

**Solisyon:** 
1. Verifye ke token JWT la valab
2. Verifye ke itilizatè a gen wòl ki nesesè yo

### Pwoblèm: Pèfòmans lan

**Koz posib:** Peryòd twò long oswa anpil done

**Solisyon:**
1. Itilize rapò jounen olye de peryòd long
2. Aktive paginasyon si disponib
3. Ekspòte nan CSV pou analiz offline

---

## Nòt Enpòtan

1. **Tout montan yo an desimal ak 2 chif apre vigil la**
2. **Dat yo nan fòma UTC (ISO 8601)**
3. **Rapò yo enkli sèlman tranzaksyon ki KONPLETE (status=Completed)**
4. **Mikrokredi ak kredi regilye konbine nan rapò yo**
5. **Transfè ant sikisyal konte nan de sikisyal yo (sous ak destinasyon)**

---

## Amelyorasyon Pwochen

- [ ] Ekspòte PDF ak grafik
- [ ] Rapò konparatif pa peryòd (mwa kont mwa)
- [ ] Rapò pa ajan/kesye
- [ ] Analiz prediksyon baze sou istorik
- [ ] Tablo de bò entèaktif an tan reyèl
- [ ] Notifikasyon otomatik pou anomali

---

Pou nenpòt kesyon oswa pwoblèm, kontakte ekip teknik la.
