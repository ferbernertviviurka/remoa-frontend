'use client';

import { useEffect, useState, type ReactNode } from 'react';
import './canvas.css';

/**
 * CanvasPanel: painel flutuante do editor (aside 340 px, raio 26, sombra de flutuante). O chamador posiciona
 * (`absolute right-5 top-5 bottom-5`) ou o coloca em grid; aqui só a casca. `aria-label` obrigatório
 * ("Painel do mapa"). Conteúdo: InspectorTabs + corpo rolável, ou QuestionPanel.
 * Animação (G06): `data-state="open"` entra com slide + fade (220 ms, só transform/opacity); com `open={false}` toca a saída
 * (`data-state="closed"`), desmonta e chama `onExited`. No celular (< 768 px, bottom sheet) sobe de baixo. Com
 * prefers-reduced-motion não há transição: desmonta na hora. `open` default true (sem `open` nada muda).
 */
export function CanvasPanel({ 'aria-label': ariaLabel, children, open = true, onExited }: { 'aria-label': string; children: ReactNode; open?: boolean; onExited?: () => void }) {
  const [present, setPresent] = useState(open);
  useEffect(() => {
    if (open) { setPresent(true); return; }
    const done = () => { setPresent(false); onExited?.(); };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return; }
    const id = setTimeout(done, 220);
    return () => clearTimeout(id);
  }, [open, onExited]);
  if (!open && !present) return null;
  return (
    <aside data-state={open ? 'open' : 'closed'} aria-label={ariaLabel} className="cv-panel box-border flex h-full w-[340px] flex-col overflow-hidden rounded-[26px] border border-border bg-surface text-(--cv-ink) shadow-[0_22px_56px_rgba(36,26,92,.14)]">
      {children}
    </aside>
  );
}
