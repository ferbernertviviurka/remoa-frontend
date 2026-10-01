/** Trilha. O último item é a página atual. */
export function Breadcrumb({ label, items }: { label: string; items: ReadonlyArray<{ label: string }> }) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden="true" className="text-muted">/</span> : null}
              <span aria-current={current ? 'page' : undefined} className={current ? 'font-bold text-text' : 'text-muted'}>
                {item.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
