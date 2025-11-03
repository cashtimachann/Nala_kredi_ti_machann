# Correction du Contraste de Texte

## Problème Identifié
Beaucoup de texte qui devrait être noir apparaissait en gris, notamment:
- Le texte saisi dans les inputs (formulaires)
- Les labels et titres
- Le texte général de l'application

## Solutions Appliquées

### 1. Variables CSS Globales (`index.css`)
✅ **Modifié:**
- `--text-primary`: `#1e293b` → `#0f172a` (plus foncé/noir)
- `--text-secondary`: `#64748b` → `#475569` (gris plus foncé)

✅ **Ajouté des règles pour les inputs:**
```css
/* Assurer que le texte dans les inputs est noir */
input, 
textarea, 
select {
  color: #0f172a !important;
}

/* Les placeholders restent gris */
input::placeholder,
textarea::placeholder {
  color: #94a3b8 !important;
}
```

### 2. Classes Tailwind dans `index.css`
✅ **Modifié:**
- `.label`: `text-gray-700` → `text-gray-900` (noir)
- `.stat-label`: reste `text-gray-700` (un peu gris pour sous-titres)

### 3. Nouveau Fichier `text-contrast-fix.css`
✅ **Créé:** `/frontend-web/src/styles/text-contrast-fix.css`

Ce fichier force les couleurs suivantes:
- **Labels & Titres:** `#1f2937` (gray-800, presque noir)
- **Texte secondaire (gray-600):** `#4b5563` (gray-700, plus foncé)
- **Texte secondaire (gray-500):** `#6b7280` (gray-600, plus foncé)
- **Inputs:** `#111827` (gray-900, noir)
- **Placeholders:** `#9ca3af` (gray-400, gris clair)
- **Titres principaux (h1, etc.):** `#000000` (noir pur)

### 4. Import du Fichier de Correction
✅ Le fichier `text-contrast-fix.css` est importé dans `index.css`:
```css
@import './styles/text-contrast-fix.css';
```

## Résultat Final

### Avant
- 😞 Texte dans inputs: gris (#64748b)
- 😞 Labels: gris moyen (#6b7280)
- 😞 Titres: gris foncé (#1e293b)

### Après
- ✅ Texte dans inputs: **NOIR** (#111827)
- ✅ Labels: **NOIR** (#1f2937)
- ✅ Titres: **NOIR PUR** (#000000)
- ✅ Placeholders: restent gris clair pour le contraste (#9ca3af)

## Hiérarchie de Contraste

1. **Noir pur (#000000)**: Titres principaux (h1, h2)
2. **Noir (#111827)**: Texte saisi dans les inputs
3. **Noir grisâtre (#1f2937)**: Labels, sous-titres, paragraphes
4. **Gris foncé (#4b5563)**: Texte secondaire
5. **Gris moyen (#6b7280)**: Info supplémentaire
6. **Gris clair (#9ca3af)**: Placeholders

## Fichiers Modifiés

1. ✅ `/frontend-web/src/index.css` - Variables et classes de base
2. ✅ `/frontend-web/src/styles/text-contrast-fix.css` - Nouveau fichier de correction

## Test Recommandé

Pour vérifier que les changements fonctionnent:
1. Ouvrir n'importe quelle page avec formulaire
2. Vérifier que les labels sont bien **noirs**
3. Taper du texte dans un input - le texte doit être **noir**
4. Les placeholders doivent rester **gris clair**
5. Les titres doivent être en **noir pur**

## Notes
- Les erreurs de lint CSS (`Unknown at rule @apply`) sont normales - ce sont des directives Tailwind CSS
- Les styles utilisent `!important` pour surcharger les classes Tailwind existantes
- Les boutons et badges gardent leurs couleurs définies (bleu, vert, rouge, etc.)
