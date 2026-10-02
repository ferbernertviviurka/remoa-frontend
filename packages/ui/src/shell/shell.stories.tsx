import type { Meta, StoryObj } from '@storybook/react';
import { AppNavbar } from './app-navbar';
import { LimitMeter } from './limit-meter';
import { PlanChip } from './plan-chip';
import { PlanPopover, type PlanPopoverProps } from './plan-popover';
import { Alert } from '../alert';
import { Icon } from '../icons';

/**
 * Navbar e painel do plano (F14). Regras: o PlanChip é sempre o `trigger` do PlanPopover; o painel abre com hover (120 ms, só em dispositivos com hover),
 * clique/Enter/Espaço fixam; Esc, clique fora ou novo clique fecham. Textos vêm por props (o app passa t(...)). Sem animação com "Reduzir movimento".
 * A ilustração é um nó: no app, next/image de `/illustrations/plan-upgrade.svg`.
 */
const meta = { title: 'Shell/Navbar e plano', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type S = StoryObj;

const upgrade = (
  <a href="/conta" className="lift flex h-[52px] items-center justify-center gap-2 rounded-btn bg-primary text-base font-bold text-on-primary no-underline">
    <Icon name="sparkle" size={18} />Fazer upgrade
  </a>
);
const freeMeters = [
  { label: 'Mapas', value: '1 de 2', used: 1, limit: 2 },
  { label: 'Cards', value: '170 de 200', used: 170, limit: 200 },
  { label: 'Correções hoje', value: '0 de 20', used: 0, limit: 20 },
  { label: 'PDFs no mês', value: '1 de 1', used: 1, limit: 1 },
];
const free: PlanPopoverProps = {
  trigger: <PlanChip plan="free">Plano Free</PlanChip>,
  label: 'Seu plano',
  title: 'Você está no plano Free',
  text: 'Nada é apagado quando você chega nos limites. Estes são os seus hoje.',
  meters: freeMeters,
  illustration: <img src="/illustrations/plan-upgrade.svg" alt="Três mapas empilhados, o terceiro com cadeado" />,
  benefits: {
    title: 'Com o Pro você ganha',
    items: [
      { icon: 'maps', lead: 'Mapas e cards ilimitados.', text: 'Sem teto para o que você estuda.' },
      { icon: 'sparkle', lead: 'Correções por IA sem limite.', text: 'Responda e corrija à vontade.' },
      { icon: 'book', lead: 'Mapas de PDF e mapas prontos.', text: 'Comece pelo material que você já tem.' },
    ],
  },
  cta: upgrade,
  loadingLabel: 'Carregando seu plano',
  error: { message: 'Não foi possível carregar seu plano.', retryLabel: 'Tentar de novo', onRetry: () => undefined },
  defaultOpen: true,
};
const frame = (p: PlanPopoverProps, plan: 'free' | 'pro' = 'free') => (
  <div className="min-h-[900px] bg-canvas">
    <AppNavbar
      home={{ href: '/', label: 'Remoa, ir para Hoje' }}
      chip={<PlanPopover {...p} trigger={<PlanChip plan={plan}>{plan === 'pro' ? 'Plano Pro' : 'Plano Free'}</PlanChip>} />}
      actions={plan === 'free' ? <a href="/conta" className="flex h-11 items-center gap-2 rounded-[14px] bg-primary px-5 text-sm font-bold text-on-primary no-underline"><Icon name="sparkle" size={18} />Fazer upgrade</a> : null}
    />
  </div>
);

export const Free: S = { render: () => frame(free) };
export const FreeFechado: S = { render: () => frame({ ...free, defaultOpen: false }) };
export const FreeNoLimite: S = {
  render: () => frame({ ...free, meters: [{ label: 'Mapas', value: '2 de 2', used: 2, limit: 2 }, ...freeMeters.slice(1)], alert: <Alert tone="review" title="Você tem 3 mapas; o Free permite 2" /> }),
};
export const Pro: S = {
  render: () => frame({ ...free, illustration: undefined, benefits: undefined, title: 'Você está no plano Pro', text: 'Renova em 1º de novembro.',
    meters: [{ label: 'Mapas', value: 'Ilimitados', used: 0, limit: null }, { label: 'Cards', value: 'Ilimitados', used: 0, limit: null }, { label: 'Correções hoje', value: 'Ilimitadas', used: 0, limit: null }, { label: 'PDFs no mês', value: '3 de 20', used: 3, limit: 20 }],
    cta: <a href="/conta" className="flex h-[50px] items-center justify-center rounded-btn border-[1.5px] border-border-strong bg-surface font-bold text-ink no-underline">Gerenciar assinatura</a> }, 'pro'),
};
export const Carregando: S = { render: () => frame({ ...free, state: 'loading' }) };
export const Erro: S = { render: () => frame({ ...free, state: 'error' }) };
export const MedidoresTons: S = {
  render: () => (
    <div className="grid max-w-md grid-cols-2 gap-2.5 p-6">
      <LimitMeter label="Normal" value="1 de 10" used={1} limit={10} />
      <LimitMeter label="80%" value="8 de 10" used={8} limit={10} />
      <LimitMeter label="100%" value="10 de 10" used={10} limit={10} />
      <LimitMeter label="Ilimitado" value="Ilimitados" used={0} limit={null} />
    </div>
  ),
};
