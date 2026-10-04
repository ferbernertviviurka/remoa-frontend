/** Barras simples, sem biblioteca de gráfico. Cada barra tem um nome para leitor de tela. */
export function BarChart({ label, items, barLabel }: { label: string; items: { id: string; value: number }[]; barLabel: (item: { id: string; value: number }) => string }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul aria-label={label} className="m-0 flex h-28 list-none items-end gap-1 p-0">
      {items.map((item) => (
        <li key={item.id} className="flex h-full min-w-0 flex-1 items-end" title={barLabel(item)}>
          <span className="sr-only">{barLabel(item)}</span>
          <span
            aria-hidden="true"
            className={`block w-full rounded-t ${item.value === 0 ? 'bg-border' : 'bg-primary'}`}
            style={{ height: item.value === 0 ? '2px' : `${Math.max(8, (item.value / max) * 100)}%` }}
          />
        </li>
      ))}
    </ul>
  );
}
