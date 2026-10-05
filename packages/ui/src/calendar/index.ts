// F25 Calendário (lane B3b). Componentes apresentacionais: dados e callbacks por props, datas já no fuso do perfil
// (`today`/`timeZone`), textos por props (strings em @remoa/strings, namespace `calendar`).
export * from './types';
export * from './palette';
export { dayKeyOf, timeOf, addDays, diffDays, startOfWeek, weekDays, monthGrid, shiftMonth, makeKey, parseKey, monthTitle, longDate, shortDate, dayAria, layoutBlocks } from './dates';
export * from './month-grid';
export * from './week-grid';
export * from './agenda-list';
export * from './gallery-card';
export * from './mini-calendar';
export * from './view-switch';
export * from './labels';
export * from './cover-upload';
export * from './event-form';
export * from './event-details';
export * from './tour';
export * from './upcoming';
export * from './states';
