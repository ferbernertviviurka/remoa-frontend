import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LayerSwitch } from './layer-switch';
import { Legend } from './legend';
import { CanvasToolbar } from './canvas-toolbar';
import { ZoomControl, stepZoom, ZOOM_MAX, ZOOM_MIN } from './zoom-control';
import { EdgeLabel } from './edge-label';
import { route } from './route';

const meta = { title: 'Torph/Canvas v2/Controles do canvas' } satisfies Meta;
export default meta;
type S = StoryObj<typeof meta>;

export const Camadas: S = {
  render: function Render() {
    const [v, setV] = useState('recall');
    return (
      <div className="flex flex-wrap items-center gap-4 p-6">
        <LayerSwitch label="Camadas" value={v} onChange={setV} options={[{ value: 'structure', label: 'Estrutura' }, { value: 'recall', label: 'Lembrança' }, { value: 'coverage', label: 'Cobertura' }]} />
        <Legend aria-label="Legenda" labels={{ review: 'Revisitar', watch: 'Acompanhar', steady: 'Mais estável', unknown: 'Sem revisões' }} />
      </div>
    );
  },
};

export const Barra: S = {
  render: function Render() {
    const [tool, setTool] = useState('select');
    const tools = [
      { id: 'select', icon: 'cursor', label: 'Selecionar', hint: 'Selecionar: clique num card para ver e editar.' }, { id: 'move', icon: 'move', label: 'Mover o mapa', hint: 'Mover o mapa: arraste o fundo.' }, { separator: true },
      { id: 'card', icon: 'plus', label: 'Adicionar card de conceito' }, { id: 'flow', icon: 'flow', label: 'Adicionar fluxograma' }, { id: 'image', icon: 'image', label: 'Adicionar imagem' }, { id: 'case', icon: 'case', label: 'Adicionar caso clínico' }, { separator: true },
      { id: 'link', icon: 'link', label: 'Ligar cards', hint: 'Ligar cards: arraste de um card para outro.' }, { id: 'tidy', icon: 'tidy', label: 'Organizar o mapa' },
    ] as const;
    return <div className="p-6"><CanvasToolbar aria-label="Ferramentas do mapa" onSelect={setTool} items={tools.map((t) => ('id' in t ? { ...t, pressed: t.id === tool } : t))} /></div>;
  },
};

/** Zoom de 60% a 140% em passos de 10%; os botões desabilitam nos limites. */
export const Zoom: S = {
  render: function Render() {
    const [z, setZ] = useState(1);
    return (
      <div className="p-6">
        <ZoomControl aria-label="Zoom" percent={`${Math.round(z * 100)}%`} zoomOutLabel="Diminuir zoom" zoomInLabel="Aumentar zoom" fitText="Ajustar"
          canZoomOut={z > ZOOM_MIN} canZoomIn={z < ZOOM_MAX} onZoomOut={() => setZ(stepZoom(z, -1))} onZoomIn={() => setZ(stepZoom(z, 1))} onFit={() => setZ(1)} />
      </div>
    );
  },
};

/** `route()` gera o `d` do path ortogonal (raio máx. 14) e o ponto da pílula; no React Flow use `routePoints` com sourceX/Y e targetX/Y. */
export const Conexao: S = {
  render: () => {
    const a = { x: 20, y: 20, w: 120, h: 60 };
    const b = { x: 300, y: 160, w: 120, h: 60 };
    const r = route(a, 'r', b, 'l');
    return (
      <div className="relative m-6 h-60 w-[460px]">
        <svg width="460" height="240" className="absolute inset-0" aria-hidden="true"><path d={r.d} fill="none" stroke="#8E88B5" strokeWidth="1.7" strokeLinecap="round" /></svg>
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: r.lx, top: r.ly }}><EdgeLabel label="evolui para" /></div>
      </div>
    );
  },
};
