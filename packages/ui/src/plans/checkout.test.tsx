import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { PriceTicker, tickValue, easeOutCubic } from './price-ticker';
import { MethodChoice } from './method-choice';
import { CouponField } from './coupon-field';
import { OrderSummary } from './order-summary';
import { RedirectOverlay } from './redirect-overlay';
import { SuccessPanel } from './success-panel';
import { FaqAccordion } from './faq-accordion';
import { violations } from '../test-utils';

const brl = (c: number) => `R$ ${(c / 100).toFixed(2).replace('.', ',')}`;
const opts = [
  { value: 'pix', label: 'Pix', description: 'Aprovação na hora', icon: <i /> },
  { value: 'card', label: 'Cartão', description: 'Crédito', icon: <i /> },
];

describe('tickValue', () => {
  it('começa na origem e termina exatamente no destino', () => {
    expect(tickValue(3900, 34900, 0)).toBe(3900);
    expect(tickValue(3900, 34900, 1)).toBe(34900);
    expect(tickValue(3900, 34900, 1.7)).toBe(34900);
    expect(tickValue(3900, 34900, 0.5)).toBe(Math.round(3900 + 31000 * easeOutCubic(0.5)));
    expect(tickValue(3900, 34900, 0.5)).toBeGreaterThan(3900 + 31000 * 0.5);
  });
});

describe('PriceTicker', () => {
  afterEach(() => { delete document.documentElement.dataset.motion; });
  it('movimento reduzido mostra o valor final direto; leitor recebe só o total', async () => {
    document.documentElement.dataset.motion = 'reduced';
    const { rerender, container } = render(<PriceTicker value={3900} format={brl} />);
    rerender(<PriceTicker value={34900} format={brl} />);
    await act(async () => {});
    expect(screen.getByTestId('ticker-frame')).toHaveTextContent('R$ 349,00');
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent('R$ 349,00');
  });
  it('anima e termina no valor final', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance'] });
    const { rerender } = render(<PriceTicker value={3900} format={brl} />);
    rerender(<PriceTicker value={34900} format={brl} />);
    await act(async () => { vi.advanceTimersByTime(120); });
    const mid = screen.getByTestId('ticker-frame').textContent;
    expect(mid).not.toBe('R$ 349,00');
    await act(async () => { vi.advanceTimersByTime(600); });
    expect(screen.getByTestId('ticker-frame')).toHaveTextContent('R$ 349,00');
    vi.useRealTimers();
  });
});

describe('MethodChoice', () => {
  function Host() { const [v, setV] = useState('pix'); return <MethodChoice label="Forma de pagamento" options={opts} value={v} onChange={setV} />; }
  it('radiogroup: clique e setas trocam a seleção; axe', async () => {
    const { container } = render(<Host />);
    expect(await violations(container)).toEqual([]);
    expect(screen.getByRole('radio', { name: /Pix/ })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: /Cartão/ }));
    expect(screen.getByRole('radio', { name: /Cartão/ })).toBeChecked();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: /Pix/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Pix/ })).toHaveFocus();
  });
});

describe('CouponField', () => {
  const labels = { toggleLabel: 'Tenho um código', inputLabel: 'Código', applyLabel: 'Aplicar', appliedLabel: 'Preço de fundador aplicado', removeLabel: 'Remover', errorMessage: 'Código inválido' };
  it('abre, foca o campo, mostra erro quando o servidor recusa', async () => {
    const onApply = vi.fn().mockResolvedValue(false);
    const { container } = render(<CouponField {...labels} applied={false} onApply={onApply} onRemove={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tenho um código' }));
    expect(screen.getByLabelText('Código')).toHaveFocus();
    await userEvent.type(screen.getByLabelText('Código'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(onApply).toHaveBeenCalledWith('abc');
    expect(await screen.findByRole('alert')).toHaveTextContent('Código inválido');
    expect(await violations(container)).toEqual([]);
  });
  it('aplicado mostra chip e Remover chama onRemove', async () => {
    const onRemove = vi.fn();
    render(<CouponField {...labels} applied onApply={async () => true} onRemove={onRemove} />);
    expect(screen.getByText('Preço de fundador aplicado')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remover' }));
    expect(onRemove).toHaveBeenCalled();
  });
});

describe('OrderSummary / overlays', () => {
  it('preço riscado tem texto acessível; axe', async () => {
    const { container } = render(
      <OrderSummary label="Resumo do pedido" badge="Pro" price="R$ 39,00" per="/mês" note="Cobrado todo mês." methodLabel="Forma de pagamento" method={<div />} coupon={<div />}
        lines={[{ label: 'Pro mensal', value: 'R$ 39,00', struck: true, srLabel: 'preço de tabela' }, { label: 'Total hoje', value: 'R$ 29,00', strong: true }]}
        nextBilling="Próxima cobrança em 2 nov." action={<button type="button">Assinar o Pro</button>} secure="Pagamento seguro" />,
    );
    expect(screen.getByText(/preço de tabela/)).toBeInTheDocument();
    expect(container.querySelector('s')).toHaveTextContent('R$ 39,00');
    expect(await violations(container)).toEqual([]);
  });
  it('RedirectOverlay é status; SuccessPanel lista benefícios e ações; axe', async () => {
    const { container } = render(<><RedirectOverlay title="Abrindo" description="Conclua no Stripe" /><SuccessPanel title="Você agora é Pro." description="ok" benefits={['A', 'B']} actions={<a href="/">Ir</a>} /></>);
    expect(screen.getByRole('status')).toHaveTextContent('Abrindo');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Ir' })).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
});

describe('FaqAccordion', () => {
  const items = [{ value: 'a', question: 'Q1', answer: 'A1' }, { value: 'b', question: 'Q2', answer: 'A2' }];
  it('uma aberta por vez; Enter e Espaço; axe', async () => {
    const seen: Array<string | null> = [];
    const { container } = render(<FaqAccordion items={items} onOpenChange={(v) => seen.push(v)} />);
    const q1 = screen.getByRole('button', { name: 'Q1' });
    const q2 = screen.getByRole('button', { name: 'Q2' });
    expect(q1).toHaveAttribute('aria-expanded', 'false');
    q1.focus();
    await userEvent.keyboard('{Enter}');
    expect(q1).toHaveAttribute('aria-expanded', 'true');
    q2.focus();
    await userEvent.keyboard(' ');
    expect(q2).toHaveAttribute('aria-expanded', 'true');
    expect(q1).toHaveAttribute('aria-expanded', 'false');
    expect(seen).toEqual(['a', 'b']); // onOpenChange: valor aberto (null ao fechar)
    expect(await violations(container)).toEqual([]);
  });
});
