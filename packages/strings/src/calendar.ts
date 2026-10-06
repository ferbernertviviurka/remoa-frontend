// P-512 (D-1079): parte do namespace `calendar` que fica no núcleo (item e ponto do rail, faixa do Hoje). O resto está em `ns-parts/calendar.ts`
// (`withStrings({ calendar: more.calendar })`), que inclui estes mesmos textos.
export const calendarCore = {
  navLabel: 'Calendário',
  banner: {
    ariaLabel: 'Compromisso chegando',
    cta: 'Ver no calendário',
    headline: '{when}: {title}',
    todayAt: 'Hoje às {time}',
    tomorrowAt: 'Amanhã às {time}',
    todayAllDay: 'Hoje, o dia todo',
    tomorrowAllDay: 'Amanhã, o dia todo',
  },
  page: {
    railDot: 'Há compromisso nas próximas 24 horas',
  },
} as const;
