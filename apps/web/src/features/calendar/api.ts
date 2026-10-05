// F25: client for /v1/calendar/* (routes typed in contracts/api.ts). Network failures throw (the page queues the write, FR-19).
import type {
  AssetRef, CalendarEvent, CalendarEventInput, CalendarEventList, CalendarEventPatch, CalendarLabel, CalendarLabelDeleted, CalendarLabelInput,
  CalendarLabelList, CalendarLabelPatch, CalendarSettings, CalendarTourSeen, CalendarView, EventRemindersInput, Result, UpcomingEvents,
} from '@remoa/contracts';
import { api, apiBase } from '@/lib/api';
import { putFile } from '@/features/cards/upload';

const json = (method: string, body?: unknown): RequestInit => ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const base = '/v1/calendar';

export const calendarApi = {
  events: (from: string, to: string) => api<CalendarEventList>(`${base}/events?from=${from}&to=${to}`),
  create: (input: CalendarEventInput) => api<CalendarEvent>(`${base}/events`, json('POST', input)),
  update: (id: string, patch: CalendarEventPatch) => api<CalendarEvent>(`${base}/events/${id}`, json('PATCH', patch)),
  remove: (id: string) => api<null>(`${base}/events/${id}`, json('DELETE')),
  duplicate: (id: string, days?: number) => api<CalendarEvent>(`${base}/events/${id}/duplicate`, json('POST', days ? { days } : {})),
  reminders: (id: string, input: EventRemindersInput) => api<CalendarEvent>(`${base}/events/${id}/reminders`, json('PATCH', input)),
  labels: () => api<CalendarLabelList>(`${base}/labels`),
  createLabel: (input: CalendarLabelInput) => api<CalendarLabel>(`${base}/labels`, json('POST', input)),
  updateLabel: (id: string, patch: CalendarLabelPatch) => api<CalendarLabel>(`${base}/labels/${id}`, json('PATCH', patch)),
  deleteLabel: (id: string) => api<CalendarLabelDeleted>(`${base}/labels/${id}`, json('DELETE')),
  settings: () => api<CalendarSettings>(`${base}/settings`),
  tourSeen: () => api<CalendarTourSeen>(`${base}/tour-seen`, json('POST')),
  setView: (view: CalendarView) => api<{ view: CalendarView }>(`${base}/view`, json('PATCH', { view })),
  upcoming: (limit = 4) => api<UpcomingEvents>(`${base}/upcoming?limit=${limit}`),
};

const fail = (): Result<never> => ({ ok: false, error: { code: 'internal', message: 'upload failed' } });

/** Cover: sign (`kind: 'calendar_cover'`) → presigned PUT → complete; the server crops to 16:9 and makes the WebP variants. */
export async function uploadCover(file: File): Promise<Result<AssetRef>> {
  try {
    const sign = await api<{ url: string; key: string }>('/v1/uploads/sign', json('POST', { mime: file.type, sizeBytes: file.size, kind: 'calendar_cover' }));
    if (!sign.ok) return sign;
    if (!(await putFile(sign.data.url, file, () => {}))) return fail();
    return await api<AssetRef>('/v1/uploads/complete', json('POST', { key: sign.data.key, license: 'own', attribution: null }));
  } catch {
    return fail();
  }
}

/** FR-18: GET /v1/calendar/events/:id.ics needs the Bearer token, so it is fetched and saved as a file (not a plain link). */
export async function downloadIcs(id: string): Promise<boolean> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const { data } = await createClient().auth.getSession();
    const res = await fetch(`${apiBase()}${base}/events/${id}.ics`, { headers: { authorization: `Bearer ${data.session?.access_token ?? ''}` }, cache: 'no-store' });
    if (!res.ok) return false;
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `${(res.headers.get('content-disposition') ?? '').match(/filename="?([^";]+)"?/)?.[1] ?? 'compromisso'}`.replace(/(\.ics)?$/, '.ics');
    a.click();
    URL.revokeObjectURL(href);
    return true;
  } catch {
    return false;
  }
}
