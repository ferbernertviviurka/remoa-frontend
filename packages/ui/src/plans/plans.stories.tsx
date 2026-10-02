import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ComparisonTable, LimitBanner, PeriodToggle, PlanColumnHeader, UsageCaption, type ComparisonRow } from './index';

/** Planos (F15). Todo texto chega por props; aqui são exemplos. A etiqueta de desconto vem do contrato. Movimento: `data-motion="reduced"` na raiz desliga tudo. */
const meta = { title: 'Planos/Componentes' } satisfies Meta;
export default meta;
type S = StoryObj<typeof meta>;

function ToggleDemo() {
  const [v, setV] = useState<'monthly' | 'annual'>('monthly');
  return <PeriodToggle aria-label="Período de cobrança" value={v} onValueChange={setV} monthlyLabel="Mensal" annualLabel="Anual" discountLabel="-25%" />;
}

export const AlternanciaDePeriodo: S = {
  render: () => <ToggleDemo />,
};

export const CabecalhosDeColuna: S = {
  render: () => (
    <div className="grid max-w-xl grid-cols-2 gap-3">
      <PlanColumnHeader plan="free" name="Free" price="R$ 0" chip="Seu plano atual" />
      <PlanColumnHeader plan="pro" name="Pro" price="R$ 29" per="/mês" chip="Recomendado" />
    </div>
  ),
};

const rows: ComparisonRow[] = [
  { id: 'maps', label: 'Mapas', sub: 'total na conta', free: '2', pro: 'Ilimitados', unlimited: true, usage: { text: 'Você usa 2 de 2', tone: 'danger' } },
  { id: 'cards', label: 'Cards', sub: 'total na conta', free: '200', pro: 'Ilimitados', unlimited: true, usage: { text: 'Você usa 170 de 200', tone: 'warn' } },
  { id: 'ai', label: 'Correções por IA', sub: 'por dia', free: '20', pro: 'Ilimitadas', usage: { text: 'Hoje: 0 de 20' } },
];

export const Matriz: S = {
  render: () => (
    <div className="max-w-3xl rounded-[30px] border border-divider bg-surface p-6">
      <ComparisonTable caption="O que muda do Free para o Pro" cornerLabel="Recurso" current="free" rows={rows}
        freeHeader={<PlanColumnHeader plan="free" name="Free" price="R$ 0" chip="Seu plano atual" />}
        proHeader={<PlanColumnHeader plan="pro" name="Pro" price="R$ 29" per="/mês" chip="Recomendado" />} />
    </div>
  ),
};

export const FaixaDeLimite: S = {
  render: () => (
    <div className="flex max-w-2xl flex-col gap-3">
      <LimitBanner action={<a href="#resumo">Ver o resumo</a>}>Você usou 2 de 2 mapas. O Pro libera o resto.</LimitBanner>
      <UsageCaption tone="warn">Você usa 170 de 200</UsageCaption>
    </div>
  ),
};
