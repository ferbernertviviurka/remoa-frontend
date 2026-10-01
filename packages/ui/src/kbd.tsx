/** Tecla de atalho. `children` é o rótulo da tecla, por exemplo "⌘K". */
export function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex min-h-6 items-center rounded-tag border border-border bg-surface px-1.5 font-sans text-[11px] font-semibold text-muted shadow-[0_1px_0_var(--border)]">
      {children}
    </kbd>
  );
}
