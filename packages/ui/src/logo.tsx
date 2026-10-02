/**
 * Logo v2. Símbolo remoa: "L" que liga dois nós, sempre --primary (aqui `currentColor`), sem gradiente/sombra.
 * `size` = largura do símbolo em px (padrão 28; Rail 36, Novo mapa 32). `withWordmark` acrescenta "remoa"
 * (minúsculo, Bricolage Grotesque 800, 26/32 do símbolo, letter-spacing −0,05em, --primary); então o nome acessível é o próprio texto.
 * Sem wordmark, `title` vira role=img; sem title, decorativo.
 */
export type LogoProps = { title?: string; size?: number; withWordmark?: boolean };

export function Logo({ title, size = 28, withWordmark = false }: LogoProps) {
  const a11y = title && !withWordmark ? { role: 'img' as const, 'aria-label': title } : { 'aria-hidden': true as const };
  const symbol = (
    <svg viewBox="0 0 96 100" width={size} height={size * 1.0625} fill="none" className="shrink-0 text-primary" {...a11y}>
      <path d="M25 20V61C25 74 33 80 46 80H75M25 44H53C68 44 75 36 75 20" stroke="currentColor" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      <rect x="16" y="11" width="18" height="18" rx="6" fill="currentColor" />
      <rect x="66" y="11" width="18" height="18" rx="6" fill="currentColor" />
    </svg>
  );
  if (!withWordmark) return symbol;
  return (
    <span className="inline-flex items-center gap-2.5 text-primary">
      {symbol}
      <span className="font-display font-extrabold leading-none tracking-[-0.05em]" style={{ fontSize: (size * 26) / 32 }}>remoa</span>
    </span>
  );
}
