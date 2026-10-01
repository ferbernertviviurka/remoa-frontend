/**
 * Símbolo remoa: "L" conectando dois nós (quadrados arredondados no topo). Sempre cor --primary, sem gradiente/sombra.
 * `title` opcional: se vier, vira role=img com rótulo; senão é decorativo (aria-hidden). `size` em px (padrão 32).
 */
export type LogoProps = { title?: string; size?: number };

export function Logo({ title, size = 32 }: LogoProps) {
  const a11y = title ? { role: 'img' as const, 'aria-label': title } : { 'aria-hidden': true as const };
  return (
    <svg
      viewBox="0 0 96 100"
      width={size}
      height={(size * 100) / 96}
      fill="none"
      stroke="currentColor"
      strokeWidth={11}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-primary"
      {...a11y}
    >
      <rect x="8" y="8" width="28" height="28" rx="8" />
      <rect x="60" y="8" width="28" height="28" rx="8" />
      <path d="M22 42V84H82M74 42V60" />
    </svg>
  );
}
