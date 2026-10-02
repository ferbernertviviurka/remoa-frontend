import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { violations } from '../test-utils';
import { ComparisonTable, LimitBanner, PeriodToggle, PlanColumnHeader, UsageCaption, type ComparisonRow } from './index';

function Toggle({ onChange }: { onChange?: (v: string) => void }) {
  const [v, setV] = useState<'monthly' | 'annual'>('monthly');
  return <PeriodToggle aria-label="Período de cobrança" value={v} onValueChange={(x) => { setV(x); onChange?.(x); }} monthlyLabel="Mensal" annualLabel="Anual" discountLabel="-25%" />;
}

describe('PeriodToggle', () => {
  it('alterna, move o marcador e mostra a etiqueta', async () => {
    const fn = vi.fn();
    const { container } = render(<Toggle onChange={fn} />);
    const thumb = screen.getByTestId('period-thumb');
    expect(thumb.style.transform).toBe('translateX(0)');
    expect(screen.getByRole('button', { name: 'Mensal' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: /Anual/ }));
    expect(fn).toHaveBeenCalledWith('annual');
    expect(thumb.style.transform).toBe('translateX(100%)');
    expect(screen.getByRole('button', { name: /Anual/ })).toHaveTextContent('-25%');
    expect(await violations(container)).toEqual([]);
  });
});

describe('PlanColumnHeader', () => {
  it('Free e Pro com preço em slot e chip', async () => {
    const { container } = render(
      <>
        <PlanColumnHeader plan="free" name="Free" price="R$ 0" chip="Seu plano atual" />
        <PlanColumnHeader plan="pro" name="Pro" price={<b>R$ 29</b>} per="/mês" chip="Recomendado" />
      </>,
    );
    expect(screen.getByText('Seu plano atual')).toBeInTheDocument();
    expect(screen.getByText('R$ 29')).toBeInTheDocument();
    expect(screen.getByText('Pro').parentElement).toHaveClass('bg-panel-dark');
    expect(await violations(container)).toEqual([]);
  });
});

const rows: ComparisonRow[] = [
  { id: 'maps', label: 'Mapas', sub: 'total na conta', free: '2', pro: 'Ilimitados', unlimited: true, usage: { text: 'Você usa 2 de 2', tone: 'danger' } },
  { id: 'ai', label: 'Correções por IA', free: '20', pro: 'Ilimitadas', usage: { text: 'Hoje: 0 de 20' } },
];
const table = (current: 'free' | 'pro') => (
  <ComparisonTable caption="Comparação" cornerLabel="Recurso" current={current} rows={rows}
    freeHeader={<PlanColumnHeader plan="free" name="Free" price="R$ 0" />} proHeader={<PlanColumnHeader plan="pro" name="Pro" price="R$ 29" />} />
);

describe('ComparisonTable', () => {
  it('semântica, cascata de 70 ms e uso só na coluna atual', async () => {
    const { container, rerender } = render(table('free'));
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getByRole('rowheader', { name: /Mapas/ })).toBeInTheDocument();
    const trs = container.querySelectorAll('tbody tr');
    expect((trs[1] as HTMLElement).style.animationDelay).toBe('70ms');
    expect(screen.getByText('Você usa 2 de 2')).toHaveAttribute('data-tone', 'danger');
    const fills = screen.getAllByTestId('cmp-fill');
    expect(fills[0]!.style.transform).toBe('scaleX(0.12)');
    expect(fills[1]!.style.transform).toBe('scaleX(1)');
    expect(await violations(container)).toEqual([]);
    rerender(table('pro'));
    const proCell = within(container.querySelector('tbody tr') as HTMLElement).getAllByRole('cell')[1];
    expect(proCell).toHaveTextContent('Você usa 2 de 2');
  });
});

describe('UsageCaption e LimitBanner', () => {
  it('tom âmbar e faixa com role status e link', async () => {
    const { container } = render(
      <>
        <UsageCaption tone="warn">Você usa 170 de 200</UsageCaption>
        <LimitBanner action={<a href="#resumo">Ver o resumo</a>}>Você usou 2 de 2 mapas. O Pro libera o resto.</LimitBanner>
      </>,
    );
    expect(screen.getByText('Você usa 170 de 200')).toHaveClass('text-watch-text');
    expect(within(screen.getByRole('status')).getByRole('link', { name: 'Ver o resumo' })).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
});
