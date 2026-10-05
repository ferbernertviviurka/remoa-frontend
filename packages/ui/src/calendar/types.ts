/** Dados do Calendário que os componentes recebem (apresentacionais: o app resolve fuso e consulta). */
export type DayKey = string; // 'YYYY-MM-DD' no fuso do perfil

export type CalendarLabelItem = { id: string; name: string; /** hex */ color: string };

export type CalendarEventItem = {
  id: string;
  title: string;
  labelId: string;
  /** instante ISO (UTC). Dia inteiro: o início do dia no fuso do perfil. */
  startsAt: string;
  endsAt?: string | null;
  allDay: boolean;
  location?: string | null;
  description?: string | null;
  coverUrl?: string | null;
};

export type CalendarView = 'month' | 'week' | 'agenda' | 'gallery';
