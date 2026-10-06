import type { CalendarSettings } from '@remoa/contracts';

/** FR-3 decided on the server (no post-hydration swap, P-506): the saved view wins; otherwise Agenda on phones, Month elsewhere. */
export function initialSettings(settings: CalendarSettings, h: { get(name: string): string | null }): CalendarSettings {
  if (settings.view !== null) return settings;
  const mobile = h.get('sec-ch-ua-mobile') === '?1' || /Android.+Mobile|iPhone|iPod/i.test(h.get('user-agent') ?? '');
  return { ...settings, view: mobile ? 'agenda' : 'month' };
}
