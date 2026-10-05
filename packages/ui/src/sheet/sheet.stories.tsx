import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { BottomSheet } from './bottom-sheet';
import { CreateCardSheet, type CreateCardSheetProps } from './create-card-sheet';
import { FloatingMapBar } from '../map-mobile/floating-map-bar';

/**
 * Regra de uso (F23): um bottom sheet por vez, aberto por um botão (o foco volta a ele ao fechar).
 * Fecha por alça, scrim, Esc e arrastando para baixo (Q-084). Limites e bloqueios vêm de `PlanDefinition`,
 * calculados pela tela e passados em `availability`; o componente nunca fixa números.
 */
const meta = { title: 'Sheet/CreateCardSheet', component: CreateCardSheet, parameters: { viewport: { defaultViewport: 'mobile1' } } } satisfies Meta<typeof CreateCardSheet>;
export default meta;

const labels: CreateCardSheetProps['labels'] = {
  concept: { title: 'Conceito' },
  flowchart: { title: 'Fluxograma' },
  case: { title: 'Caso clínico' },
  image: { title: 'Imagem' },
  photo: { title: 'Tirar foto', description: 'do atlas ou da apostila' },
  ai: { title: 'Gerar com IA', description: 'sem limite' },
  pdf: { title: 'Importar PDF', description: '20 no mês' },
  anki: { title: 'Importar do Anki', description: '.apkg' },
};
const base: CreateCardSheetProps = {
  open: true,
  title: 'Criar card',
  closeLabel: 'Fechar',
  groups: { scratch: 'Do zero', fast: 'Mais rápido' },
  labels,
  badges: { pro: 'Pro', soon: 'Em breve' },
  onSelect: () => {},
};
type S = StoryObj<typeof meta>;

function WithTrigger() {
  const [open, setOpen] = useState(false);
  return <CreateCardSheet {...base} open={open} onOpenChange={setOpen} trigger={<button className="m-4 rounded-btn bg-primary px-4 py-3 text-white">Criar card</button>} />;
}

export const Aberta: S = { args: base };
export const BloqueiosDoPlano: S = {
  args: { ...base, availability: { ai: { status: 'limit', hint: 'restam 0 hoje' }, pdf: { status: 'pro', hint: '1 no mês' }, anki: { status: 'soon' } } },
};
/** Movimento reduzido: o sheet aparece direto (use o toggle de movimento do Storybook ou `data-motion="reduced"`). */
export const MovimentoReduzido: S = {
  args: base,
  decorators: [
    (Story) => {
      document.documentElement.dataset.motion = 'reduced';
      return <Story />;
    },
  ],
};
export const ComGatilho: S = {
  args: base,
  render: () => <WithTrigger />,
};
export const AlturaMeia: StoryObj = {
  render: () => (
    <BottomSheet open title="Meia altura" showTitle closeLabel="Fechar" height="half">
      <p>Conteúdo com rolagem interna.</p>
    </BottomSheet>
  ),
};
/** Como no mapa (mock `mapa-mobile-criar`): a barra flutuante fica por cima do scrim e da sheet, com o "×" que fecha. */
function WithBar() {
  const [open, setOpen] = useState(true);
  const bar = (o: boolean, onCreate: () => void) => (
    <FloatingMapBar reviewLabel="Revisar" dueCount={2} onReview={() => {}} listLabel="Cards em lista" onToggleList={() => {}} createLabel="Criar card" createOpen={o} onCreate={onCreate} />
  );
  return (
    <div className="relative h-[844px]">
      {bar(open, () => setOpen(true))}
      <CreateCardSheet {...base} open={open} onOpenChange={setOpen} footer={bar(open, () => setOpen(false))} availability={{ ai: { hint: 'restam 4 no mês' }, pdf: { hint: '4 no mês' } }} />
    </div>
  );
}
export const ComBarraDoMapa: StoryObj = { render: () => <WithBar /> };
