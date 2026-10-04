/**
 * Logo v3 (G11, D-350). Símbolo de 3 nós (topo, esquerda, direita) ligados por hastes a um núcleo central.
 * Cores fiéis ao arquivo da marca (`logo-c-horizontal.svg`), em hex: topo #6D5BD0 (= --primary), esquerda #C2410C, direita #CA8A04,
 * núcleo #241A5C, hastes #C9C3E6; só topo e wordmark têm token equivalente (--primary, --ink), os demais não existem nos tokens.
 * `onDark` usa a paleta clara do `logo-c-app-icon.svg` (#C9BFFF, #FDBA74, #FCD34D, núcleo branco, hastes #7A6FB0; todos >= 3:1 sobre #241A5C)
 * e wordmark branco. `size` = altura do símbolo em px (padrão 28); com `withWordmark` o SVG é a lockup horizontal (wordmark em curvas,
 * independe de fonte) com altura 1,2 x size. Nome acessível: `title` (role=img); com wordmark, "remoa" por padrão; sem ambos, decorativo.
 */
export type LogoProps = { title?: string; size?: number; withWordmark?: boolean; onDark?: boolean };

const light = { top: '#6D5BD0', left: '#C2410C', right: '#CA8A04', core: '#241A5C', stem: '#C9C3E6' };
const dark = { top: '#C9BFFF', left: '#FDBA74', right: '#FCD34D', core: '#FFFFFF', stem: '#7A6FB0' };
const WORDMARK = 'M124.24 74.52V21.48H139.53V33.96H139.84V74.52ZM139.84 46.86 138.49 34.27Q140.36 27.51 144.62 23.98Q148.89 20.44 155.23 20.44Q157.21 20.44 158.14 20.86V35.42Q157.62 35.21 156.69 35.16Q155.75 35.1 154.4 35.1Q146.91 35.1 143.38 37.76Q139.84 40.41 139.84 46.86Z M189.03 75.56Q180.19 75.56 173.64 72.08Q167.09 68.59 163.5 62.35Q159.91 56.11 159.91 48Q159.91 39.78 163.5 33.6Q167.09 27.41 173.54 23.92Q179.98 20.44 188.51 20.44Q196.73 20.44 202.76 23.77Q208.79 27.1 212.12 33.02Q215.45 38.95 215.45 46.96Q215.45 48.62 215.34 50.03Q215.24 51.43 215.03 52.68H169.06V42.38H202.45L199.74 44.26Q199.74 37.81 196.68 34.74Q193.61 31.67 188.3 31.67Q182.17 31.67 178.79 35.83Q175.41 39.99 175.41 48.31Q175.41 56.42 178.79 60.38Q182.17 64.33 188.93 64.33Q192.67 64.33 195.38 63.08Q198.08 61.83 199.43 59.02H214.1Q211.5 66.72 205.2 71.14Q198.91 75.56 189.03 75.56Z M222.21 74.52V21.48H237.5V33.96H237.81V74.52ZM257.88 74.52V40.82Q257.88 36.77 255.75 34.84Q253.62 32.92 249.77 32.92Q246.44 32.92 243.68 34.43Q240.93 35.94 239.37 38.69Q237.81 41.45 237.81 45.19L236.46 33.23Q239.06 27.41 244 23.92Q248.94 20.44 255.9 20.44Q264.22 20.44 268.85 25.12Q273.48 29.8 273.48 36.87V74.52ZM293.55 74.52V40.82Q293.55 36.77 291.42 34.84Q289.29 32.92 285.44 32.92Q282.11 32.92 279.36 34.43Q276.6 35.94 275.04 38.69Q273.48 41.45 273.48 45.19L271.09 33.23Q273.69 27.41 278.84 23.92Q283.98 20.44 291.26 20.44Q299.9 20.44 304.52 25.28Q309.15 30.11 309.15 37.91V74.52Z M344.62 75.56Q335.88 75.56 329.28 72.08Q322.67 68.59 318.98 62.3Q315.29 56.01 315.29 47.79Q315.29 39.58 318.98 33.44Q322.67 27.3 329.28 23.87Q335.88 20.44 344.62 20.44Q353.46 20.44 360.06 23.87Q366.66 27.3 370.3 33.44Q373.94 39.58 373.94 47.79Q373.94 56.01 370.25 62.3Q366.56 68.59 359.96 72.08Q353.35 75.56 344.62 75.56ZM344.62 63.29Q348.26 63.29 351.22 61.42Q354.18 59.54 355.95 56.06Q357.72 52.58 357.72 47.69Q357.72 40.51 353.92 36.61Q350.13 32.71 344.62 32.71Q339.1 32.71 335.31 36.66Q331.51 40.62 331.51 47.69Q331.51 52.58 333.28 56.06Q335.05 59.54 338.01 61.42Q340.98 63.29 344.62 63.29Z M414.09 74.52Q413.46 72.23 413.2 69.63Q412.94 67.03 412.94 63.6H412.53V38.54Q412.53 35.31 410.4 33.49Q408.26 31.67 404.1 31.67Q400.15 31.67 397.81 33.02Q395.47 34.38 394.74 36.98H379.87Q380.91 29.8 387.26 25.12Q393.6 20.44 404.62 20.44Q416.06 20.44 422.1 25.54Q428.13 30.63 428.13 40.2V63.6Q428.13 66.2 428.49 68.85Q428.86 71.5 429.69 74.52ZM395.58 75.56Q387.67 75.56 382.99 71.56Q378.31 67.55 378.31 60.9Q378.31 53.51 383.88 48.99Q389.44 44.46 399.42 43.11L414.92 40.93V49.98L402.02 51.95Q397.86 52.58 395.89 54.24Q393.91 55.9 393.91 58.82Q393.91 61.42 395.78 62.77Q397.66 64.12 400.78 64.12Q405.66 64.12 409.1 61.47Q412.53 58.82 412.53 55.28L413.98 63.6Q411.7 69.53 407.02 72.54Q402.34 75.56 395.58 75.56Z';

export function Logo({ title, size = 28, withWordmark = false, onDark = false }: LogoProps) {
  const c = onDark ? dark : light;
  const label = title ?? (withWordmark ? 'remoa' : undefined);
  const a11y = label ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': true as const };
  return (
    <svg viewBox={withWordmark ? '0 0 435.85 96' : '0 0 96 96'} height={withWordmark ? size * 1.2 : size} width={withWordmark ? (size * 1.2 * 435.85) / 96 : size} fill="none" className="shrink-0" {...a11y}>
      <path d="M48 56V24M48 56L22 72M48 56L74 72" stroke={c.stem} strokeWidth={6} strokeLinecap="round" />
      <rect x="34" y="10" width="28" height="28" rx="9" fill={c.top} />
      <rect x="8" y="58" width="28" height="28" rx="9" fill={c.left} />
      <rect x="60" y="58" width="28" height="28" rx="9" fill={c.right} />
      <circle cx="48" cy="56" r="11" fill={c.core} />
      {withWordmark ? <path d={WORDMARK} fill={onDark ? '#FFFFFF' : 'var(--ink)'} /> : null}
    </svg>
  );
}
