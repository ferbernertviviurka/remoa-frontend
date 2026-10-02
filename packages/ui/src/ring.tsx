/**
 * Ring: anel de progresso (svg 52 px, raio 21, traço 6, ponta redonda, começa às 12h).
 * tone = on-dark (padrão: trilho branco 20%, traço branco; dentro do Hero) | primary (trilho --track, traço --primary).
 * `value`/`max` (max > 0). Decorativo (aria-hidden) salvo se `label` vier (role=img, ex.: "3 de 15 revisados hoje").
 */
export type RingProps = {
  value: number;
  max: number;
  size?: number;
  tone?: "on-dark" | "primary";
  label?: string;
};

const R = 21;
const C = 2 * Math.PI * R;

export function Ring({
  value,
  max,
  size = 52,
  tone = "on-dark",
  label,
}: RingProps) {
  const frac = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const a11y = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      className="shrink-0"
      {...a11y}
    >
      <circle
        cx="26"
        cy="26"
        r={R}
        fill="none"
        strokeWidth="6"
        stroke={tone === "on-dark" ? "rgba(255,255,255,.2)" : "var(--track)"}
      />
      {/* a round cap draws a dot even at 0: no arc then */}
      {frac > 0 ? (
        <circle
          data-testid="ring-arc"
          cx="26"
          cy="26"
          r={R}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          stroke={tone === "on-dark" ? "#fff" : "var(--primary)"}
          strokeDasharray={`${(C * frac).toFixed(1)} ${C.toFixed(1)}`}
          transform="rotate(-90 26 26)"
        />
      ) : null}
    </svg>
  );
}
