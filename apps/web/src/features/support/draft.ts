const KEY = 'remoa-support-draft';
const TTL = 24 * 3_600_000;

export type Draft = { type: string; subject: string; description: string; at: number };

/** FR-6: draft kept 24 h. localStorage can throw (private mode): everything degrades to "no draft". */
export function loadDraft(now = Date.now()): Draft | null {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Draft | null;
    if (d && now - d.at < TTL) return d;
    localStorage.removeItem(KEY);
  } catch { /* no draft */ }
  return null;
}
export function saveDraft(d: Omit<Draft, 'at'>) {
  try {
    if (d.type || d.subject || d.description) localStorage.setItem(KEY, JSON.stringify({ ...d, at: Date.now() }));
    else localStorage.removeItem(KEY);
  } catch { /* not persisted */ }
}
export const clearDraft = () => {
  try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
};
