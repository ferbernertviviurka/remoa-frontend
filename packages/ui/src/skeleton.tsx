import type { CSSProperties, ReactNode } from 'react';

/** Placeholder de carregamento. `lines` controla quantas barras (padrão 3). */
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={`remoa-skeleton h-3 rounded-pill bg-grid ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

/** Bloco de shimmer com medidas livres (px ou CSS: `'100%'`, `300`), raio em px. Decorativo (`aria-hidden`). */
export function SkeletonBlock({ width = '100%', height = 12, radius = 12, flex }: { width?: number | string; height?: number | string; radius?: number | string; flex?: number }) {
  const style: CSSProperties = { width, height, borderRadius: radius, ...(flex != null ? { flex } : {}) };
  return <div aria-hidden="true" style={style} className="remoa-skeleton max-w-full shrink-0 bg-grid" />;
}

/** Região de carregamento de uma tela: `role="status"` + `aria-busy`, com `label` só para leitor de tela (passe `t('common.loading')`). */
export function SkeletonRegion({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
