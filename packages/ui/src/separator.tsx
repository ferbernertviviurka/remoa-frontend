/** Divisor horizontal ou vertical. */
export function Separator({ orientation = 'horizontal' }: { orientation?: 'horizontal' | 'vertical' }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={orientation === 'vertical' ? 'h-full w-px bg-border' : 'h-px w-full bg-border'}
    />
  );
}
