import type { ColumnItem } from './column-chart';
import type { HeatCell } from './heatmap';
import type { LinePoint } from './line-chart';

/** Dados de exemplo (stories e testes). Textos fictícios pt-BR passados por props, como a página faz. */
export const days = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
export const forecast: ColumnItem[] = Array.from({ length: 14 }, (_, i) => ({ id: `d${i}`, label: days[i % 7] ?? '', full: `${i + 1} de out`, value: [12, 8, 15, 4, 0, 0, 9, 22, 6, 3, 11, 7, 5, 14][i] ?? 0, highlight: i === 0 }));
export const retention: LinePoint[] = Array.from({ length: 30 }, (_, i) => ({ id: `r${i}`, value: 82 + Math.round(6 * Math.sin(i / 4)), date: `${i + 1} set` }));
export const activity: HeatCell[] = Array.from({ length: 105 }, (_, i) => ({ id: `a${i}`, level: (((i * 37 + 11) % 11) % 5) as HeatCell['level'], label: `${i % 9} revisões em dia ${i + 1}`, future: i > 98 }));
