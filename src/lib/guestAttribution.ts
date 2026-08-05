const EMAIL_ENTRY_KEY = 'tokyoInnPendingEmailEntry';

export function captureEmailEntry(search: string): void {
  const params = new URLSearchParams(search);
  if (params.get('source') !== 'email') return;
  const type = params.get('type')?.trim().slice(0, 80) || 'unknown';
  try {
    sessionStorage.setItem(EMAIL_ENTRY_KEY, type);
  } catch {
    // Attribution is optional when browser storage is unavailable.
  }
}

export function consumeEmailEntry(): string | null {
  try {
    const type = sessionStorage.getItem(EMAIL_ENTRY_KEY);
    sessionStorage.removeItem(EMAIL_ENTRY_KEY);
    return type;
  } catch {
    return null;
  }
}
