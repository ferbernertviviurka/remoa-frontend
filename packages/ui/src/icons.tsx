import type { SVGProps } from 'react';

/**
 * Ícones da interface v2 (copiados de `docs/design/v2/source/build.py` › `ICONS`). 24 × 24, traço 1,8, `currentColor`.
 * Decorativos por padrão (`aria-hidden`); o rótulo fica no botão que os contém.
 */
const paths = {
  home: <><path d="M3 11.5L12 4l9 7.5" /><path d="M5.5 10v10h13V10" /></>,
  maps: <><rect x="3" y="3" width="6" height="6" rx="2" /><rect x="15" y="15" width="6" height="6" rx="2" /><rect x="15" y="3" width="6" height="6" rx="2" /><path d="M9 6h6M18 9v6M6 9v9h9" /></>,
  bolt: <><path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" /></>,
  bars: <><path d="M5 20V11M12 20V4M19 20v-7M3 20h18" /></>,
  store: <><path d="M3 9l2-5h14l2 5M4 9v11h16V9M3 9c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0M9 20v-6h6v6" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  minus: <><path d="M5 12h14" /></>,
  left: <><path d="M19 12H5M11 6l-6 6 6 6" /></>,
  right: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  close: <><path d="M6 6l12 12M18 6L6 18" /></>,
  cursor: <><path d="M5 3l14 7-6 2-2 6z" /></>,
  move: <><path d="M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4" /></>,
  link: <><path d="M10 14l4-4M9 16l-2 2a4 4 0 01-6-6l4-4a4 4 0 016 0M15 8l2-2a4 4 0 016 6l-4 4a4 4 0 01-6 0" /></>,
  flow: <><rect x="3" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="16" width="7" height="5" rx="1.5" /><path d="M6.5 8v4h11v4" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-8 8" /></>,
  case: <><path d="M9 3h6v4H9zM5 7h14v14H5zM9 14h6M12 11v6" /></>,
  tidy: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="8" y="14" width="8" height="7" rx="2" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3M9 21h6" /></>,
  check: <><path d="M5 12l5 5L20 6" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  file: <><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 13h6M9 17h4" /></>,
  download: <><path d="M12 4v12M7 11l5 5 5-5M4 20h16" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></>,
  warning: <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17h.01" /></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5M4 15v5h16v-5" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></>,
  book: <><path d="M4 4h7a3 3 0 013 3v13a2 2 0 00-2-2H4zM20 4h-6" /><path d="M20 4v14h-6" /></>,
  sparkle: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></>,
  archive: <><path d="M4 7h16M5 7v13h14V7M9 11h6M3 4h18v3H3z" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  logout: <><path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" /></>,
  pencil: <><path d="M4 20h4L19 9l-4-4L4 16z" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 7l9 6 9-6" /></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18M10.6 6.2A9.8 9.8 0 0112 6c6 0 10 6 10 6a17 17 0 01-3.2 3.7M6.2 7.6A17 17 0 002 12s4 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 004.2 4.2" /></>,
  phone: <><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="3" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
  monitor: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>,
  // F15 (Planos.dc.html): Pix (QR), card, chevron of the coupon disclosure
  pix: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3v3h-3zM20 14v1M14 20h1M18 18v3h3" /></>,
  creditCard: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h4" /></>,
  chevronDown: <><path d="M6 9l6 6 6-6" /></>,
} as const;

export type IconName = keyof typeof paths;
export const iconNames = Object.keys(paths) as IconName[];

export function Icon({ name, size = 24, strokeWidth = 1.8, ...rest }: { name: IconName; size?: number; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, 'children'>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {paths[name]}
    </svg>
  );
}
