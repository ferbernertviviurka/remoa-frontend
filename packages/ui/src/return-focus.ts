import { useRef } from 'react';

/**
 * Devolve o foco a quem abriu um diálogo controlado (sem `Trigger`). O Radix só restaura o foco para o `Trigger`; com `open` controlado
 * (botão flutuante, linha da tabela) o foco iria para o <body>. Use: `<RD.Content {...useReturnFocus()}>` (WCAG 2.4.3).
 */
export function useReturnFocus() {
  const opener = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    onCloseAutoFocus: (e: Event) => {
      if (!opener.current?.isConnected) return;
      e.preventDefault();
      opener.current.focus();
    },
  };
}
