// Centralized API error extraction
// Supports ASP.NET Core ProblemDetails, custom { message }, arrays, and plain strings
export function extractApiErrorMessage(error: any, fallback: string = 'Une erreur est survenue'): string {
  if (!error) return fallback;
  const data = error.response?.data ?? error.data ?? error;

  // Already parsed
  if (typeof data === 'string') return data || fallback;

  // Custom message property
  if (data?.message && typeof data.message === 'string') return data.message;

  // ProblemDetails pattern - collect all validation messages when present
  if (data?.title || data?.errors) {
    if (data.errors && typeof data.errors === 'object') {
      // Gather all validation messages in order
      const messages: string[] = [];
      for (const key of Object.keys(data.errors)) {
        const val = data.errors[key];
        if (Array.isArray(val)) {
          val.forEach(v => { if (typeof v === 'string' && v.trim()) messages.push(v); });
        } else if (typeof val === 'string' && val.trim()) {
          messages.push(val);
        }
      }
      if (messages.length) return mapFriendlyValidationMessages(messages).join('; ');
    }
    if (typeof data.title === 'string' && data.title.trim().length) return data.title;
  }

  // Multiple messages array
  if (Array.isArray(data)) {
    const first = data.find((d: any) => typeof d === 'string') || data[0];
    if (typeof first === 'string') return first;
    if (first?.message) return first.message;
  }

  // Nested message
  if (data?.error && typeof data.error === 'string') return data.error;

  return fallback;
}

// Optionally attach parsed message to error object for upstream consumers
export function attachParsedError(error: any): any {
  try {
    const msg = extractApiErrorMessage(error);
    if (error && typeof error === 'object') {
      (error as any).parsedMessage = msg;
      // Also attach a parsed array of validation messages if available
      try {
        const data = error.response?.data ?? error.data ?? error;
        if (data?.errors && typeof data.errors === 'object') {
          const parsed: string[] = [];
          for (const k of Object.keys(data.errors)) {
            const v = data.errors[k];
            if (Array.isArray(v)) v.forEach((x: any) => typeof x === 'string' && parsed.push(x));
            else if (typeof v === 'string') parsed.push(v);
          }
          if (parsed.length) (error as any).parsedErrors = mapFriendlyValidationMessages(parsed);
        }
      } catch { /* ignore */ }
    }
  } catch (_) { /* ignore */ }
  return error;
}

// Map known validation messages to clearer, user-friendly text
export function mapFriendlyValidationMessages(messages: string[]): string[] {
  try {
    return messages.map(m => {
      const msg = (m || '').trim();
      if (!msg) return msg;
      const lower = msg.toLowerCase();
      const mentionsPhotoUrl = lower.includes('photourl');
      const mentionsMaxLen = lower.includes('maximum length of 500') || lower.includes('max length of 500') || lower.includes('longueur maximale de 500') || lower.includes('500');
      if (mentionsPhotoUrl && mentionsMaxLen) {
        return "La photo doit être une URL courte (≤ 500 caractères), pas une chaîne base64. Téléchargez le fichier et utilisez l’URL.";
      }
      return msg;
    });
  } catch {
    return messages;
  }
}
