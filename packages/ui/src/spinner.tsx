/** Indicador de espera. Com `label`, anuncia o estado; sem ele, é decorativo (dentro de um botão). */
export function Spinner({ label }: { label?: string }) {
  return (
    <span
      {...(label ? { role: 'status' as const, 'aria-label': label } : { 'aria-hidden': true as const })}
      className="inline-flex h-5 w-5 items-center justify-center"
    >
      <span className="remoa-spin h-4 w-4 rounded-pill border-2 border-current/30 border-t-current" />
    </span>
  );
}
