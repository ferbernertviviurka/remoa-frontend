import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LockedListingCard, SoonBanner, SplitSimulator, StatusTrack, StoreHeroArt, StoreTabs, StepList } from './index';

/** Loja de mapas, Fase A (F20). Textos por props (no app: `store.*`). Nomes e notas dos cartões são fictícios. */
const meta = { title: 'Loja/Componentes', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type S = StoryObj<typeof meta>;
const brl = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;

export const Aviso: S = { render: () => <SoonBanner text="A Loja de mapas ainda não está disponível." seal="EM BREVE" /> };
export const Etapas: S = { render: () => <StatusTrack items={[{ title: 'Lista de espera', desc: 'Cadastre-se.', chip: 'Agora', now: true }, { title: 'Vendedores publicam', desc: 'Primeiro grupo.', chip: 'Em seguida' }, { title: 'Loja aberta', desc: 'Todos compram.', chip: 'Sem data ainda' }]} /> };
function AbasDemo() {
  const [v, setV] = useState('buy');
  return <StoreTabs label="Para quem" value={v} onValueChange={setV} tabs={[{ value: 'buy', label: 'Quero comprar', content: <StepList steps={[{ title: 'Encontre', desc: 'Filtre.' }]} /> }, { value: 'sell', label: 'Quero vender', content: <StepList steps={[{ title: 'Publique', desc: 'Monte.' }]} /> }]} />;
}
export const Abas: S = { render: () => <AbasDemo /> };
function SimuladorDemo() {
  const [p, setP] = useState(49);
  return <SplitSimulator priceLabel="Preço do mapa" price={p} onPriceChange={setP} sellerPct={85} formatMoney={brl} labels={{ buyer: 'Comprador', payment: 'Pagamento', you: 'Você', brand: 'remoa', seller: 'vendedor', platform: 'plataforma', sellerLegend: 'Vendedor 85%', platformLegend: 'Plataforma 15%', note: 'Valores de exemplo.' }} />;
}
export const Simulador: S = { render: () => <SimuladorDemo /> };
export const PreviaTravada: S = { render: () => <div className="max-w-xs"><LockedListingCard exampleLabel="Exemplo" title="Cardiologia para a prova" author="Dr. Rafael M." badge="Médico verificado" meta="Clínica Médica · 86 cards" rating="4,9" ratingLabel="Nota 4,9" priceMask="R$ 00,00" priceLabel="Preço disponível na abertura" /></div> };
export const Heroi: S = { render: () => <StoreHeroArt /> };
