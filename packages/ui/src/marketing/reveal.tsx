import type { CSSProperties, ReactNode } from 'react';

/**
 * Revelação ao rolar (subida de 34 px + opacidade ao longo de 45% da entrada), CSS puro via
 * `animation-timeline: view()` dentro de `@supports`. Sem suporte o conteúdo fica visível.
 * Gancho opcional para o app (Safari/Firefox antigos): o elemento leva `data-reveal-target`; o app pode pôr
 * `data-reveal="hidden"` e trocar para `"shown"` num IntersectionObserver (a transição está em motion.css).
 * `delay` (ms) só vale nesse caminho com o gancho. Movimento reduzido: estático.
 */
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <div className="mk-reveal" data-reveal-target="" style={{ '--mk-delay': `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}
