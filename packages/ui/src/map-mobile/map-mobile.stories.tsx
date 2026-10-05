import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CompactMapHeader, FloatingMapBar, IconPill, MapCard, MapEdgeLabel, MapGlyph, type MapCardProps, type MapSaveStatus } from '.';

const meta = { title: 'Torph/Mapa no celular/Cabeçalho, pílulas e barra' } satisfies Meta;
export default meta;
type S = StoryObj<typeof meta>;

/** Moldura 390 × 844 como nos mocks (fundo pontilhado do canvas). */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto h-[844px] w-[390px] overflow-hidden bg-canvas" style={{ backgroundImage: 'radial-gradient(var(--grid-dot) 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }}>
      {children}
    </div>
  );
}

const STATUS_TEXT: Record<MapSaveStatus, string> = {
  saved: 'Salvo há 2 min',
  saving: 'Salvando…',
  offline: 'Sem conexão, salvando depois',
  error: 'Não salvou',
};

function Header({ status, open = false }: { status: MapSaveStatus; open?: boolean }) {
  const [searchOpen, setOpen] = useState(open);
  const [q, setQ] = useState('');
  return (
    <CompactMapHeader
      title="Sepse"
      status={status}
      statusText={STATUS_TEXT[status]}
      retryLabel="Tentar de novo"
      onRetry={() => {}}
      menuLabel="Abrir o menu do mapa"
      onMenu={() => {}}
      searchLabel="Buscar card"
      searchPlaceholder="Buscar card"
      onSearchOpen={() => setOpen(true)}
      searchOpen={searchOpen}
      query={q}
      onQueryChange={setQ}
      closeSearchLabel="Fechar busca"
      onSearchClose={() => { setOpen(false); setQ(''); }}
    />
  );
}

export const CabecalhoSalvo: S = { render: () => <Frame><div className="absolute inset-x-3 top-[50px]"><Header status="saved" /></div></Frame> };
export const CabecalhoSalvando: S = { render: () => <Frame><div className="absolute inset-x-3 top-[50px]"><Header status="saving" /></div></Frame> };
export const CabecalhoSemConexao: S = { render: () => <Frame><div className="absolute inset-x-3 top-[50px]"><Header status="offline" /></div></Frame> };
export const CabecalhoErro: S = { render: () => <Frame><div className="absolute inset-x-3 top-[50px]"><Header status="error" /></div></Frame> };
export const CabecalhoBusca: S = { render: () => <Frame><div className="absolute inset-x-3 top-[50px]"><Header status="saved" open /></div></Frame> };

export const DesfazerRefazer: S = {
  render: () => (
    <Frame>
      <div className="absolute top-[118px] left-3">
        <IconPill aria-label="Desfazer e refazer" items={[
          { key: 'u', label: 'Desfazer', icon: <MapGlyph name="undo" />, onClick: () => {}, disabled: true },
          { key: 'r', label: 'Refazer', icon: <MapGlyph name="redo" />, onClick: () => {}, disabled: true },
        ]} />
      </div>
    </Frame>
  ),
};

export const Zoom: S = {
  render: function Render() {
    const [z, setZ] = useState(100);
    return (
      <Frame>
        <div className="absolute top-[118px] right-3">
          <IconPill aria-label="Zoom" caption={`${z}%`} items={[
            { key: 'in', label: 'Aproximar', icon: <MapGlyph name="plus" />, onClick: () => setZ((v) => Math.min(180, v + 25)), disabled: z >= 180 },
            { key: 'out', label: 'Afastar', icon: <MapGlyph name="minus" />, onClick: () => setZ((v) => Math.max(40, v - 25)), disabled: z <= 40 },
            { key: 'fit', label: 'Ajustar à tela', icon: <MapGlyph name="fit" />, onClick: () => setZ(100) },
          ]} />
        </div>
      </Frame>
    );
  },
};

export const BarraFlutuante: S = {
  render: function Render() {
    const [list, setList] = useState(false);
    const [open, setOpen] = useState(false);
    return (
      <Frame>
        <FloatingMapBar reviewLabel="Revisar" reviewAriaLabel="Revisar este mapa, 2 para hoje" dueCount={2} onReview={() => {}} listLabel={list ? 'Voltar ao mapa' : 'Cards em lista'} listActive={list} onToggleList={() => setList(!list)} createLabel="Criar card" createOpen={open} onCreate={() => setOpen(!open)} />
      </Frame>
    );
  },
};
export const BarraSemVencidos: S = { render: () => <Frame><FloatingMapBar reviewLabel="Revisar" onReview={() => {}} listLabel="Cards em lista" onToggleList={() => {}} createLabel="Criar card" onCreate={() => {}} /></Frame> };
export const BarraListaAtiva: S = { render: () => <Frame><FloatingMapBar reviewLabel="Revisar" dueCount={2} onReview={() => {}} listLabel="Voltar ao mapa" listActive onToggleList={() => {}} createLabel="Criar card" onCreate={() => {}} /></Frame> };
export const BarraSheetAberta: S = { render: () => <Frame><FloatingMapBar reviewLabel="Revisar" dueCount={2} onReview={() => {}} listLabel="Cards em lista" onToggleList={() => {}} createLabel="Criar card" createOpen onCreate={() => {}} /></Frame> };

export const RegraDeUso: S = {
  render: () => (
    <Frame>
      <div className="absolute inset-x-6 top-40 text-sm text-ink-2">
        Posicionamento é do consumidor: cabeçalho a 12 px das bordas (safe area no topo), IconPill a 118 px do topo; FloatingMapBar já se posiciona em
        absolute no contêiner do mapa. Dentro do mapa só há UM botão de criar (D-661). A barra some (`hidden`) com o editor aberto.
      </div>
    </Frame>
  ),
};

/** Cards compactos (F23 FR-5/FR-6) nos dois níveis do zoom semântico, como `mapa-mobile-mapa.png` e `mapa-mobile-visao.png`. */
const cards: MapCardProps[] = [
  { type: 'concept', typeLabel: 'Conceito', title: 'Sepse', state: 'steady', stateLabel: 'Mais estável', recallLabel: '94%', summary: 'Disfunção orgânica grave por resposta desregulada à infecção.', selectLabel: 'Sepse' },
  { type: 'concept', typeLabel: 'Conceito', title: 'Triagem', state: 'watch', stateLabel: 'Acompanhar', recallLabel: '71%', summary: 'SIRS, NEWS2 ou qSOFA: nenhum isolado afasta sepse.', selectLabel: 'Triagem' },
  { type: 'case', typeLabel: 'Caso clínico', title: 'Caso 12', state: 'watch', stateLabel: 'Acompanhar', recallLabel: '83%', summary: 'Mulher, 68 anos, febre e confusão. PA 80/50, lactato 3,4.', selectLabel: 'Caso 12' },
  { type: 'flow', typeLabel: 'Fluxograma', title: 'Pacote da 1ª hora', state: 'review', stateLabel: 'Revisitar', recallLabel: '64%', steps: ['Dosar lactato', 'Hemoculturas antes do ATB', 'ATB de amplo espectro'], stepsMore: '+ 2 passos', selectLabel: 'Pacote' },
  { type: 'image', typeLabel: 'Imagem', title: 'Rx de tórax: foco', state: 'unknown', stateLabel: 'Sem revisões', image: { src: null, alt: 'Imagem' }, selectLabel: 'Rx' },
  { type: 'note', typeLabel: 'Conteúdo', title: 'Diretriz', state: 'unknown', stateLabel: 'Sem revisões', summary: 'Resumo da diretriz.', selectLabel: 'Diretriz' },
];
const Cards = ({ level, selected, dimmed }: Pick<MapCardProps, 'level' | 'selected' | 'dimmed'>) => (
  <div className="flex flex-wrap items-start gap-3 bg-canvas p-4">
    {cards.map((c, i) => <MapCard key={c.title} {...c} level={level} selected={selected && i === 0} dimmed={dimmed && i > 0} />)}
  </div>
);
export const CardsCompletos: S = { render: () => <Cards level="full" /> };
export const CardsVisaoGeral: S = { render: () => <Cards level="overview" /> };
export const CardSelecionadoEBusca: S = { render: () => <Cards level="full" selected dimmed /> };
export const RotulosDeConexao: S = { render: () => <div className="flex gap-3 bg-canvas p-4"><MapEdgeLabel label="suspeita" /><MapEdgeLabel label="evolui para" hot /><MapEdgeLabel label="sem rótulo" empty /></div> };
