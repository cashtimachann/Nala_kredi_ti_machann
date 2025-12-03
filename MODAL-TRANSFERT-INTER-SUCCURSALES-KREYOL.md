# Modal Transfè Ant Siksale (Inter-Branch Transfer Modal)

## 📋 Rezime

Nou kreye yon modal konplè pou jere transfè lajan ant siksale yo nan aplikasyon desktop la. Modal sa a gen tout fonksyonalite yo pou fè transfè an sekirite ak validasyon pwòp.

## 🎯 Karakteristik Prensipal

### 1. **Seleksyone Siksale Destinasyon**
- Lis tout siksale disponib yo
- Afiche non, komín, depatman, ak kòd siksale
- Validasyon obligatwa

### 2. **Konfigirasyon Lajan**
- Chwazi ant HTG (Goud) oswa USD (Dola)
- Antre montan an avèk validasyon
- Kalkilasyon otomatik ak chip vizyèl

### 3. **Konvèsyon Lajan (Exchange Rate)**
- Taux de change ajistab
- Kalkilasyon otomatik montan konvèti a
- Afichaj dinamik rezilta a

### 4. **Motif ak Nòt**
- Motif obligatwa (minimum 5 karaktè)
- Nòt opsyonèl pou enfòmasyon siplemantè
- Validasyon tèks

### 5. **Sistèm Alèt**
- **Alèt Montan Elve**: Lè montan an depase 100,000 Gds
- **Rezime Transfè**: Afichaj rezime konplè anvan validasyon
- **Validasyon Otorizasyon**: Notifikasyon pou transfè ki bezwen apwobasyon

## 📁 Fichye yo

### Fichye Prensipal Kreye
```
/frontend-desktop/src/components/branch-manager/InterBranchTransferModal.tsx
```

### Fichye Modifye
```
/frontend-desktop/src/components/branch-manager/SpecialOperationsModule.tsx
```

## 🔧 Kòman pou Itilize Modal la

### Enpòte Modal la
```typescript
import InterBranchTransferModal from './InterBranchTransferModal';
```

### Itilize Modal la nan yon konpozan
```typescript
const [transferDialogOpen, setTransferDialogOpen] = useState(false);

const handleTransferSubmit = (transferData: any) => {
  // Trete done transfè a
  console.log('Processing transfer:', transferData);
};

// Nan JSX ou
<InterBranchTransferModal
  open={transferDialogOpen}
  onClose={() => setTransferDialogOpen(false)}
  onSubmit={handleTransferSubmit}
/>
```

### Pou Modifye yon Transfè
```typescript
<InterBranchTransferModal
  open={transferDialogOpen}
  onClose={() => setTransferDialogOpen(false)}
  onSubmit={handleTransferSubmit}
  isEditing={true}
  initialData={existingTransferData}
/>
```

## 🎨 Konpozan Vizyèl yo

### 1. **Chip Monnen**
- HTG: Chip bleu
- USD: Chip vèt

### 2. **Ikòn yo**
- 🏢 BuildingIcon: Siksale
- 💰 MoneyIcon: Montan
- 🧮 CalculateIcon: Konvèsyon
- 📄 DescriptionIcon: Motif
- ⚠️ WarningIcon: Alèt
- ✈️ SendIcon: Voye

### 3. **Koulè ak Estil**
- Primary (Bleu): Eleman prensipal yo
- Success (Vèt): Rezime pozitif
- Warning (Jòn): Alèt ak avètisman
- Info (Bleu kle): Enfòmasyon siplemantè

## 📊 Validasyon Done yo

### Règ Validasyon:
1. **Siksale Destinasyon**: Obligatwa
2. **Montan**: 
   - Obligatwa
   - Dwe pozitif
   - Dwe yon nonb valid
3. **Motif**: 
   - Obligatwa
   - Minimum 5 karaktè
4. **Taux de Change**: 
   - Dwe pozitif
   - Default: 1

### Mesaj Erè:
- "Succursale de destination requise"
- "Montant invalide"
- "Motif requis (minimum 5 caractères)"
- "Taux de change invalide"

## 🔐 Sekirite ak Apwobasyon

### Nivo Otorizasyon:
- **< 100,000 Gds**: Otorizasyon Chef de Succursale
- **> 100,000 Gds**: Bezwen validasyon Directeur Régional

### Alèt Sekirite:
Modal la afiche yon alèt wòj/jòn lè montan an depase limit la, avèk mesaj:
> "Montant élevé détecté (> 100,000 Gds)  
> Une validation du Directeur Régional sera requise avant l'exécution"

## 📝 Estrikti Done Transfè

```typescript
interface TransferFormData {
  toBranchId: string;          // ID siksale destinasyon
  toBranchName?: string;        // Non siksale a
  amount: string;               // Montan transfè a
  currency: 'HTG' | 'USD';      // Monnen
  exchangeRate: string;         // Taux konvèsyon
  reason: string;               // Motif transfè a
  notes: string;                // Nòt opsyonèl
}
```

## 🌐 Entegrasyon API

### Aksyon pou Ajoute:
```typescript
const loadBranches = async () => {
  // TODO: Ranplase ak apèl API reyèl
  const branches = await apiService.getAllBranches();
  setAvailableBranches(branches);
};

const handleSubmit = async (data: TransferFormData) => {
  // TODO: Voye done bay backend
  const result = await apiService.createInterBranchTransfer(data);
  return result;
};
```

## 🎯 Karakteristik Ekstra

### 1. **Kalkilatè Otomatik**
- Kalkilasyon montan konvèti an tan reyèl
- Afichaj dinamik selon taux de change

### 2. **Rezime Transfè**
- Kase vèt ki montre rezime konplè
- Destinasyon, montan, ak konvèsyon

### 3. **Reset Otomatik**
- Fòm la efase lè ou fèmen modal la
- Evite done rezidyèl

### 4. **Esperyans Itilizatè**
- Validasyon an tan reyèl
- Mesaj erè klè ak presi
- Koulè ak ikòn pou gide itilizatè a

## 🔄 Aksyon Disponib

### Bouton yo:
1. **Annuler** (Gri): Fèmen modal la san sove
2. **Initier le Transfert** (Bleu): Voye transfè a
3. **Modifier le Transfert** (Bleu): Modifye transfè egzistan

### Eta Bouton:
- Disabled lè done enkomplè
- Aktivite lè done valid

## 📱 Responsiv

Modal la adapte byen pou:
- Desktop (max-width: md)
- Tablet (grid ajistab)
- Afichaj dinamik eleman yo

## 🚀 Pwochen Etap

### Amelyorasyon pou Ajoute:
1. **Koneksyon API reyèl** pou chaje siksale yo
2. **Validasyon kote servè** 
3. **Istorik transfè** nan modal la
4. **Enpresyon resi** transfè a
5. **Notifikasyon push** pou siksale destinasyon an
6. **Signatir dijital** pou transfè enpotan
7. **Konfimasyon doub** pou montan elve

## 💡 Tips pou Devlopè yo

### Pou Personalize Modal la:
1. Modifye `availableBranches` pou itilize done reyèl
2. Ajiste limit montan nan `isHighAmount`
3. Ajoute règ validasyon siplemantè nan `validateForm`
4. Personalize mesaj alèt yo

### Pou Teste:
```typescript
// Test avèk montan elve
setFormData({ ...formData, amount: '150000' });

// Test san siksale
setFormData({ ...formData, toBranchId: '' });

// Test motif kout
setFormData({ ...formData, reason: 'abc' });
```

## 🎓 Egzanp Itilizasyon

### Egzanp 1: Transfè Senp
```typescript
const transferData = {
  toBranchId: '2',
  toBranchName: 'Cap-Haïtien',
  amount: '50000',
  currency: 'HTG',
  exchangeRate: '1',
  reason: 'Renforcement de liquidité pour fin de mois',
  notes: 'Transfert urgent'
};
```

### Egzanp 2: Transfè ak Konvèsyon
```typescript
const transferData = {
  toBranchId: '3',
  toBranchName: 'Gonaïves',
  amount: '1000',
  currency: 'USD',
  exchangeRate: '135.50',
  reason: 'Approvisionnement en devises',
  notes: 'Taux du jour'
};
```

## ✅ Chèklist Enplemantasyon

- [x] Kreye konpozan Modal la
- [x] Ajoute validasyon done yo
- [x] Enplemante kalkilatè konvèsyon
- [x] Ajoute sistèm alèt
- [x] Entegre nan SpecialOperationsModule
- [ ] Konekte ak API backend
- [ ] Teste ak done reyèl
- [ ] Ajoute unit tests
- [ ] Dokimante API endpoints

## 📞 Sipò

Pou kesyon oswa pwoblèm, kontakte ekip devlopman an.

---

**Vèsyon:** 1.0.0  
**Dat Kreyasyon:** 2 Desanm 2025  
**Devlopè:** GitHub Copilot
