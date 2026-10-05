import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { LockedListingCard, SoonBanner, SplitSimulator, StoreTabs, splitCents } from './index';
import { violations } from '../test-utils';

const brl = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;
const labels = { buyer: 'Comprador', payment: 'Pagamento', you: 'Você', brand: 'remoa', seller: 'vendedor', platform: 'plataforma', sellerLegend: 'Vendedor 85%', platformLegend: 'Plataforma 15%', note: 'Exemplo' };

describe('splitCents', () => {
  it('a soma é sempre o total, mesmo com arredondamento', () => {
    for (let p = 19; p <= 199; p += 5) for (const pct of [33, 66.6, 70, 85]) {
      const s = splitCents(p, pct);
      expect(s.seller + s.platform).toBe(s.total);
    }
    expect(splitCents(49, 70)).toEqual({ total: 4900, seller: 3430, platform: 1470 });
  });
});

describe('SplitSimulator', () => {
  it('anuncia o preço, recalcula as partes e é acessível', async () => {
    const Harness = () => { const [p, setP] = useState(49); return <SplitSimulator priceLabel="Preço do mapa" price={p} onPriceChange={setP} sellerPct={85} formatMoney={brl} labels={labels} />; };
    const { container } = render(<Harness />);
    const slider = screen.getByRole('slider', { name: 'Preço do mapa' });
    expect(slider).toHaveAttribute('aria-valuetext', 'R$ 49,00');
    expect(screen.getByText('R$ 41,65')).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: '54' } });
    expect(slider).toHaveAttribute('aria-valuetext', 'R$ 54,00');
    expect(await violations(container)).toEqual([]);
  });
});

describe('StoreTabs', () => {
  it('troca por clique e por setas', async () => {
    const Harness = () => { const [v, setV] = useState('buy'); return <StoreTabs label="Para quem" value={v} onValueChange={setV} tabs={[{ value: 'buy', label: 'Comprar', content: <p>passos comprar</p> }, { value: 'sell', label: 'Vender', content: <p>passos vender</p> }]} />; };
    render(<Harness />);
    expect(screen.getByRole('tab', { name: 'Comprar' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: 'Vender' }));
    expect(screen.getByText('passos vender')).toBeInTheDocument();
    screen.getByRole('tab', { name: 'Vender' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Comprar' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('LockedListingCard e SoonBanner', () => {
  it('prévia: aria-disabled, nada focalizável, preço com rótulo; aviso é status', async () => {
    const { container } = render(<><SoonBanner text="Ainda não disponível" seal="EM BREVE" /><LockedListingCard exampleLabel="Exemplo" title="Mapa" author="Dr. X" badge="Verificado" meta="CM" rating="4,9" ratingLabel="Nota 4,9" priceMask="R$ 00,00" priceLabel="Preço na abertura" /></>);
    expect(screen.getByRole('status')).toHaveTextContent('Ainda não disponível');
    expect(container.querySelector('[aria-disabled="true"]')).not.toBeNull();
    expect(container.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0);
    expect(screen.getByLabelText('Preço na abertura')).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
});
