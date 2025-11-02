export type GenderLabel = 'Masculin' | 'Féminin' | '—';

// Parse various gender representations into numeric enum 0 = Male, 1 = Female
export function parseGender(g: any): 0 | 1 {
  if (g === undefined || g === null || g === '') return 0;
  if (typeof g === 'number') return g === 1 ? 1 : 0;
  const s = String(g).trim().toLowerCase();
  if (s === '1' || s === 'f' || s === 'female' || s === 'feminin' || s === 'fem' || s === 'fanm') return 1;
  return 0;
}

export function genderLabel(g: any): GenderLabel {
  const parsed = parseGender(g);
  return parsed === 0 ? 'Masculin' : 'Féminin';
}

// Convert to form shorthand 'M'|'F'
export function genderToMF(g: any): 'M' | 'F' {
  return parseGender(g) === 0 ? 'M' : 'F';
}
