import type { SVGProps } from 'react';
import { Icon, type IconName } from '../icons';

const extra = {
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  undo: <><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 010 12h-3" /></>,
  redo: <><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 000 12h3" /></>,
  concept: <><rect x="4" y="5" width="16" height="14" rx="3" /><path d="M8 10h8M8 14h5" /></>,
  fit: <path d="M4 9V5a1 1 0 011-1h4M20 9V5a1 1 0 00-1-1h-4M4 15v4a1 1 0 001 1h4M20 15v4a1 1 0 01-1 1h-4" />,
  resize: <path d="M20 12l-8 8M20 17l-3 3M20 7L7 20" />,
} as const;

export type MapGlyphName = IconName | keyof typeof extra;

/** Ícone decorativo do mapa no celular: os do `Icon` mais menu, desfazer, refazer e ajustar. */
export function MapGlyph({ name, size = 22 }: { name: MapGlyphName; size?: number }) {
  if (name in extra) {
    const p: SVGProps<SVGSVGElement> = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
    return <svg {...p}>{extra[name as keyof typeof extra]}</svg>;
  }
  return <Icon name={name as IconName} size={size} />;
}
