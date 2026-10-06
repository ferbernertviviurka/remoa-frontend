import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { PriceTicker } from './price-ticker';
import { MethodChoice } from './method-choice';
import { CouponField } from './coupon-field';
import { OrderSummary } from './order-summary';
import { RedirectOverlay } from './redirect-overlay';
import { SuccessPanel } from './success-panel';
import { FaqAccordion } from './faq-accordion';
import { Button } from '../button';
import { Icon } from '../icons';

const brl = (c: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c / 100);
const methods = [
  { value: 'card', label: 'Cartão', description: 'Crédito, renova sozinho', icon: <Icon name="file" /> },
  { value: 'pix', label: 'Pix', description: 'Aprovação na hora', icon: <Icon name="grid" />, disabled: true, badge: 'Em breve' },
];

const meta = { title: 'Planos/Checkout' } satisfies Meta;
export default meta;
type S = StoryObj;

/** Regra de uso: o servidor valida o código (`onApply`); a UI só mostra o resultado. Data de cobrança também vem do servidor. */
function ResumoDemo() {
    const [annual, setAnnual] = useState(false);
    const [method, setMethod] = useState('card');
    const [applied, setApplied] = useState(false);
    const price = (annual ? 34900 : 3900) - (applied ? (annual ? 5000 : 1000) : 0);
    return (
      <div className="max-w-[400px]">
        <OrderSummary
          label="Resumo do pedido" badge="Pro" price={<PriceTicker value={price} format={brl} />} per={annual ? '/ano' : '/mês'} note="Cobrado uma vez por período."
          saving={annual ? 'Economize R$ 119,00 por ano' : undefined} methodLabel="Forma de pagamento"
          method={<MethodChoice label="Forma de pagamento" options={methods} value={method} onChange={setMethod} />}
          coupon={<CouponField toggleLabel="Tenho um código de fundador" inputLabel="Código de fundador" placeholder="Digite seu código" applyLabel="Aplicar" appliedLabel="Preço de fundador aplicado" removeLabel="Remover" errorMessage="Código inválido." applied={applied} onApply={async (c) => { const ok = c.toUpperCase() === 'FUNDADOR'; setApplied(ok); return ok; }} onRemove={() => setApplied(false)} />}
          lines={[...(applied ? [{ label: 'Pro', value: brl(annual ? 34900 : 3900), struck: true, srLabel: 'preço de tabela' }] : []), { label: 'Total hoje', value: brl(price), strong: true }]}
          nextBilling="Próxima cobrança em 2 de novembro de 2026."
          action={<Button size="lg" onClick={() => setAnnual(!annual)}>Assinar o Pro</Button>}
          secure="Pagamento seguro pelo Stripe." secureIcon={<Icon name="lock" size={16} />}
        />
      </div>
    );
}
export const Resumo: S = { render: () => <ResumoDemo /> };
export const Redirecionando: S = { render: () => <RedirectOverlay title="Abrindo o pagamento seguro" description="Você conclui com Pix no Stripe e volta para cá em seguida." /> };
export const Sucesso: S = {
  render: () => <SuccessPanel title="Você agora é Pro." description="Seu plano foi atualizado." benefits={['Mapas ilimitados', 'Desafios sem limite', 'Importação de Anki', 'Revisão avançada']} actions={<Button>Ir para Hoje</Button>} />,
};
export const Faq: S = {
  render: () => <FaqAccordion defaultOpen="a" items={[{ value: 'a', question: 'Posso cancelar quando quiser?', answer: 'Sim, em um clique.' }, { value: 'b', question: 'E se eu voltar ao Free?', answer: 'Seus mapas continuam seus.' }]} />,
};
