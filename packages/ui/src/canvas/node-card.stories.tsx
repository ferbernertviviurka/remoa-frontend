import type { Meta, StoryObj } from '@storybook/react';
import { NodeCard } from './node-card';
import { EditorFixture } from './fixtures';

const meta = { title: 'Torph/Canvas v2/NodeCard' } satisfies Meta;
export default meta;
type S = StoryObj<typeof meta>;

const base = { selectLabel: 'Selecionar', layer: 'recall', state: 'steady', footer: 'Mais estável · 94%' } as const;

/** Variantes por tipo (tamanhos fixos). Regra de uso: sempre dentro de um nó do React Flow; o `<button>` cobre o card. */
export const Tipos: S = {
  render: () => (
    <div className="flex flex-wrap items-start gap-6 p-6">
      <NodeCard {...base} type="concept" typeLabel="Conceito" title="Sepse" summary="Disfunção orgânica grave por resposta desregulada à infecção." />
      <NodeCard {...base} type="case" typeLabel="Caso clínico" title="Caso 12" state="watch" footer="Acompanhar · 83%" chips={[{ label: 'Exames', active: true }, { label: 'Diagnóstico' }, { label: 'Conduta' }]} />
      <NodeCard {...base} type="flow" typeLabel="Fluxograma" title="Pacote da 1ª hora" state="review" footer="Revisitar · 64% · vence hoje" due steps={[{ text: 'Dosar lactato' }, { text: 'Hemoculturas antes do ATB' }, { text: 'ATB de amplo espectro' }, { text: 'Cristaloide 30 mL/kg' }, { text: 'Noradrenalina se PAM < 65', tone: 'weak' }]} />
      <NodeCard {...base} type="image" typeLabel="Imagem" title="Rx de tórax: foco" state="unknown" footer="Sem revisões ainda" image={{ src: null, alt: 'Imagem enviada por você' }} />
    </div>
  ),
};

/** Camadas: Lembrança (cor do estado), Estrutura (neutro) e Cobertura (primário). Sem reflow entre elas. */
export const Camadas: S = {
  render: () => (
    <div className="flex flex-wrap gap-6 p-6">
      {(['recall', 'structure', 'coverage'] as const).map((layer, i) => (
        <NodeCard key={layer} {...base} type="concept" typeLabel="Conceito" title="Choque séptico" summary="Vasopressor para PAM ≥ 65 e lactato > 2 apesar de volume." layer={layer} state="review"
          footer={['Revisitar · 58% · vence hoje', '2 conexões', 'Entra em Sepse e choque séptico'][i]!} />
      ))}
    </div>
  ),
};

/** `pulse` (anel laranja) só com vencido + Lembrança + fora do desafio + sem seleção; desligado com prefers-reduced-motion. */
export const Pulse: S = {
  render: () => (
    <div className="flex gap-6 p-6">
      <NodeCard {...base} type="concept" typeLabel="Conceito" title="Vencido" summary="Pulsa." state="review" footer="Revisitar · 58% · vence hoje" due />
      <NodeCard {...base} type="concept" typeLabel="Conceito" title="Selecionado" summary="Sem pulso, anel primário." state="review" footer="Revisitar · 58%" due selected />
      <NodeCard {...base} type="concept" typeLabel="Conceito" title="Estrutura" summary="Sem pulso." layer="structure" state="review" footer="2 conexões" due />
    </div>
  ),
};

/** Modo desafio: testado em destaque, vizinho a 50%, demais a 18%. */
export const Desafio: S = {
  render: () => (
    <div className="flex gap-6 p-6">
      {(['target', 'neighbor', 'dim'] as const).map((c) => (
        <NodeCard key={c} {...base} type="concept" typeLabel="Conceito" title={c} summary="Papel no desafio." challenge={c} />
      ))}
    </div>
  ),
};

/** Composição completa (Editor v2) com todos os componentes do canvas, sem React Flow. */
export const EditorCompleto: StoryObj = { render: () => <EditorFixture />, parameters: { layout: 'fullscreen' } };
export const DesafioCompleto: StoryObj = { render: () => <EditorFixture challenge />, parameters: { layout: 'fullscreen' } };
