import type { ReactNode } from 'react';
import { t } from '@remoa/strings';
import { SkeletonBlock as B, SkeletonRegion } from '@remoa/ui';

/** Esqueletos de `loading.tsx` (editor e novo mapa) e do `MainSlot` (Hoje/Mapas/Revisar, sem Suspense para evitar o throttle de 300 ms). Espelham o layout (grid, padding, raios) de cada tela v2 para nada pular quando o conteúdo chega. */
const Region = ({ children }: { children: ReactNode }) => <SkeletonRegion label={t('common.loading')}>{children}</SkeletonRegion>;

const Header = ({ titleW = 520 }: { titleW?: number }) => (
  <div className="flex flex-wrap items-end justify-between gap-6">
    <div className="flex flex-col gap-2">
      <B width={180} height={12} />
      <B width={titleW} height={48} radius={14} />
    </div>
    <div className="flex gap-3"><B width={130} height={48} radius={14} /><B width={130} height={48} radius={14} /></div>
  </div>
);

const Tile = ({ h }: { h: number }) => <B height={h} radius={26} />;

export function HomeSkeleton() {
  return (
    <Region>
      <div className="-m-4 box-border flex flex-col gap-7 px-4 py-6 md:-m-6 md:px-12 md:pb-12 md:pt-9">
        <Header titleW={640} />
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-7">
            <B height={300} radius={30} />
            <B width={260} height={28} radius={10} />
            <div className="grid gap-5 md:grid-cols-2 min-[1100px]:grid-cols-3"><Tile h={312} /><div className="hidden md:block"><Tile h={312} /></div><div className="hidden min-[1100px]:block"><Tile h={312} /></div></div>
            <B height={190} radius={28} />
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            <B height={250} radius={28} />
            <B height={285} radius={28} />
            <B height={330} radius={28} />
          </div>
        </div>
      </div>
    </Region>
  );
}

export function SeedDetailSkeleton() {
  return (
    <Region>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 md:px-6 md:py-[13px]">
        <B width={160} height={20} radius={10} />
        <B width={480} height={48} radius={14} />
        <B width={360} height={16} />
        <B width={200} height={48} radius={14} />
        <div className="flex flex-col gap-3"><B height={180} radius={26} /><B height={180} radius={26} /><B height={180} radius={26} /></div>
      </div>
    </Region>
  );
}

export function BoardsSkeleton() {
  return (
    <Region>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 md:px-6 md:py-[13px]">
        <Header titleW={360} />
        <div className="flex gap-2.5"><B width={90} height={44} radius={999} /><B width={140} height={44} radius={999} /></div>
        <div className="grid grid-cols-1 gap-[22px] md:grid-cols-2 xl:grid-cols-3"><Tile h={300} /><Tile h={300} /><Tile h={300} /></div>
      </div>
    </Region>
  );
}

export function ReviewSkeleton() {
  return (
    <Region>
      <div className="flex flex-col gap-6">
        <B width={420} height={32} radius={10} />
        <div className="grid grid-cols-3 gap-3"><B height={84} radius={20} /><B height={84} radius={20} /><B height={84} radius={20} /></div>
        <div className="flex flex-col gap-3"><B height={68} radius={20} /><B height={68} radius={20} /></div>
        <B width={160} height={48} radius={14} />
      </div>
    </Region>
  );
}

/**
 * Editor: mesma caixa do MapCanvas (cabeçalho de 68 px + canvas) e as peças flutuantes nos mesmos lugares: camadas no topo
 * à esquerda, zoom + barra embaixo. Sem painel: sem card selecionado ele não existe (D-098). Usado pelo `loading.tsx` da rota
 * e pelo carregamento do chunk do canvas (`lazy-canvas`), para não haver intervalo em branco entre os dois (G02).
 */
export function EditorSkeleton() {
  return (
    <Region>
      <div className="relative -m-4 flex h-[calc(100dvh-80px)] min-h-[480px] flex-col bg-canvas md:-m-6 md:h-dvh">
        <div className="flex h-[68px] shrink-0 items-center gap-2 border-b border-border bg-surface px-3 md:gap-3.5 md:px-5">
          <B width={44} height={44} radius={14} />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:flex-none"><B width={90} height={10} /><B width={200} height={22} radius={8} /></div>
          <span className="hidden grow md:block" />
          <B width={172} height={46} radius={16} />
          <span className="hidden grow md:block" />
          <span className="hidden gap-3.5 md:flex"><B width={200} height={36} radius={12} /><B width={170} height={36} radius={12} /></span>
          <span className="md:hidden"><B width={36} height={36} radius={12} /></span>
        </div>
        <div className="relative flex-1">
          <div className="absolute left-4 top-4 md:left-5 md:top-5"><B width={300} height={46} radius={16} /></div>
          <div className="absolute bottom-4 left-4 flex items-end gap-[23px] md:bottom-6 md:left-5">
            <B width={196} height={52} radius={16} />
            <span className="hidden md:block"><B width={430} height={60} radius={18} /></span>
          </div>
        </div>
      </div>
    </Region>
  );
}

export function NewMapSkeleton() {
  return (
    <Region>
      <div className="flex min-h-dvh flex-col gap-7 bg-canvas px-6 pb-8 pt-[30px] md:px-14">
        <B width={120} height={44} radius={14} />
        <B width={460} height={48} radius={14} />
        <div className="grid gap-5 md:grid-cols-3"><B height={200} radius={26} /><B height={200} radius={26} /><B height={200} radius={26} /></div>
      </div>
    </Region>
  );
}

/** Genérico para rotas sem esqueleto próprio (loja, progresso, editorial, admin, onboarding...): título + blocos. */
export function PageSkeleton() {
  return (
    <Region>
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 md:px-6 md:py-[13px]">
        <B width={320} height={40} radius={12} />
        <B height={140} radius={28} />
        <div className="grid gap-5 md:grid-cols-2"><Tile h={220} /><Tile h={220} /></div>
      </div>
    </Region>
  );
}
