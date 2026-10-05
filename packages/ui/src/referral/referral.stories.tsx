import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ReferralCopyField, ShareChannels, ChipInput, RewardStat, ReferralMap, ReferralLegend, FriendList, FriendRow, FriendDetail, ProgressTracker, SuccessRing, ReferralHero } from './index';
import { friendsAndamento, friendsMuitos, heroArt, statusLabels } from './fixtures';

/**
 * Indicação de amigos (F18). Referência: `docs/design/v2/screens/indicar-*.png` e `convite-*.png` (1440 × 900).
 * Todo texto chega por props (aqui, exemplos); no app vem de `@remoa/strings` (`referral.*`). Movimento: `data-motion="reduced"` na raiz mostra o quadro final.
 * Regra de uso: o mapa (`ReferralMap`) é `aria-hidden`; a lista (`FriendList` + `FriendRow`) é a representação principal e as duas compartilham a seleção (mesmo `selectedId`).
 */
const meta = { title: 'Indicação/Componentes', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type S = StoryObj<typeof meta>;

const copy = { label: 'Seu link de convite', copyLabel: 'Copiar link', copiedLabel: 'Copiado', deniedLabel: 'Não foi possível copiar. Selecione o link e copie com Ctrl+C.' };

export const CopiarLink: S = { render: () => <div className="max-w-[780px]"><ReferralCopyField value="remoa.app/i/4K2F-9QXM" {...copy} /></div> };

/** FR-24: área de transferência negada (simulado: sem `navigator.clipboard` e sem `execCommand`). */
export const CopiarNegado: S = {
  render: () => {
    if (typeof navigator !== 'undefined') Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('negado')) }, configurable: true });
    if (typeof document !== 'undefined') document.execCommand = () => false;
    return <div className="max-w-[780px]"><ReferralCopyField value="remoa.app/i/4K2F-9QXM" {...copy} /></div>;
  },
};

export const Compartilhar: S = {
  render: () => <div className="max-w-[780px]"><ShareChannels aria-label="Compartilhar" channels={[{ id: 'whatsapp', label: 'WhatsApp' }, { id: 'telegram', label: 'Telegram' }, { id: 'email', label: 'E-mail' }, { id: 'more', label: 'Mais opções' }]} onShare={() => undefined} /></div>,
};

const chipProps = {
  label: 'E-mail do amigo', placeholder: 'amigo@email.com', addLabel: 'Adicionar', removeLabel: (e: string) => `Remover ${e}`,
  sendLabel: (n: number) => `Enviar ${n} ${n === 1 ? 'convite' : 'convites'}`,
  messages: { invalid: 'Digite um e-mail válido.', duplicate: 'Esse e-mail já está na lista.', max: 'Você pode enviar até 5 convites por vez.' },
};
function ChipDemo({ start = [] as string[], error, limitReached }: { start?: string[]; error?: string; limitReached?: boolean }) {
  const [emails, setEmails] = useState(start);
  return <div className="max-w-[780px]"><ChipInput {...chipProps} emails={emails} onEmailsChange={setEmails} onSend={() => setEmails([])} error={error} retryLabel="Tentar de novo" onRetry={() => undefined} limitReached={limitReached} /></div>;
}
export const ConvitePorEmail: S = { render: () => <ChipDemo start={['ana@gmail.com', 'bruno@email.com']} /> };
/** FR-24: erro ao enviar, com "Tentar de novo". */
export const ConviteErro: S = { render: () => <ChipDemo start={['ana@gmail.com']} error="Não foi possível enviar os convites." /> };
/** FR-24: limite diário (20 por dia) atingido. */
export const ConviteLimiteDiario: S = { render: () => <ChipDemo start={['ana@gmail.com']} limitReached error="Você chegou ao limite de 20 convites por dia. Tente de novo amanhã." /> };

const reward = {
  label: 'Seu Pro grátis', unitOne: 'mês', unitMany: 'meses', emptyText: 'Nenhum mês ainda. O primeiro amigo que criar um mapa libera o primeiro mês de Pro para vocês dois.',
  historyTitle: 'Últimas recompensas', historyEmpty: 'As recompensas aparecem aqui.',
  history: [{ id: 'a', title: '+1 mês de Pro', detail: 'Ana C. criou o primeiro mapa · 28 set' }, { id: 'b', title: '+1 mês de Pro', detail: 'Bruno M. criou o primeiro mapa · 30 set' }],
};
const freeNote = 'Os meses são usados em sequência. Quando acabarem, você volta ao plano Free sem perder nada.';
export const RecompensaFree: S = { render: () => <div className="w-[380px]"><RewardStat {...reward} months={2} untilText="Pro grátis até 3 de dezembro de 2026" days={{ left: 61, total: 61, text: 'Faltam 61 dias de Pro grátis' }} note={freeNote} /></div> };
export const RecompensaPro: S = { render: () => <div className="w-[380px]"><RewardStat {...reward} months={2} untilText="Crédito para as suas próximas cobranças" note="Você já assina o Pro. Cada mês vira crédito na sua próxima cobrança." /></div> };
export const RecompensaVazia: S = { render: () => <div className="w-[380px]"><RewardStat {...reward} months={0} history={[]} note={freeNote} /></div> };
export const RecompensaCarregando: S = { render: () => <div className="w-[380px]"><RewardStat {...reward} months={0} history={[]} note="" loadingLabel="Carregando" /></div> };
/** FR-12: momento da recompensa; o total soma de 2 para 3 e o cartão pulsa duas vezes. */
function MomentoDemo() {
  const [m, setM] = useState(2);
  return <div className="flex w-[380px] flex-col gap-3"><RewardStat {...reward} months={m} pulse={m === 3} untilText="Pro grátis até 3 de janeiro de 2027" note={freeNote} /><button type="button" className="min-h-11 rounded-[13px] border-[1.5px] border-dashed border-border-strong bg-surface px-4 text-[13px] font-bold" onClick={() => setM(3)}>Simular recompensa</button></div>;
}
export const RecompensaMomento: S = { render: () => <MomentoDemo /> };

const legend = (f: typeof friendsAndamento) => (['qualified', 'signed_up', 'invited'] as const).map((s) => ({ status: s, label: `${f.filter((x) => x.status === s).length} ${statusLabels[s]}` }));
const mapText = { youLabel: 'Você', badgeLabel: '+1 mês', inviteLabel: 'Convidar' };
const timeline = (status: 'qualified' | 'signed_up' | 'invited') => {
  const rank = { invited: 0, signed_up: 1, qualified: 2 }[status];
  return ['Convite enviado', 'Criou a conta', 'Criou o primeiro mapa'].map((label, i) => ({ id: String(i), label, done: rank >= i }));
};
const whenFor = (s: 'qualified' | 'signed_up' | 'invited') => (s === 'qualified' ? 'Criou o primeiro mapa em 28 set' : s === 'signed_up' ? 'Cadastrou em 1 out' : 'Convite em 2 out');
const detailText = { qualified: 'Vocês dois ganharam 1 mês de Pro em 28 set.', signed_up: 'O mês é liberado para os dois quando essa pessoa criar o primeiro mapa.', invited: 'Quando criar a conta e o primeiro mapa, vocês dois ganham 1 mês de Pro.' };

function MapDemo({ friends, initial }: { friends: typeof friendsAndamento; initial?: string }) {
  const [sel, setSel] = useState(initial ?? friends.find((f) => f.status === 'signed_up')?.id ?? friends[0]?.id);
  const cur = friends.find((f) => f.id === sel);
  return (
    <div className="flex flex-col gap-6 rounded-[40px] border border-border bg-surface p-8">
      <ReferralLegend items={legend(friends)} />
      <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-6 max-lg:grid-cols-1">
        <ReferralMap friends={friends} selectedId={sel} onSelect={setSel} {...mapText} />
        <div className="flex flex-col gap-3.5">
          <FriendList aria-label="Amigos" emptyText="Você ainda não convidou ninguém. Mande seu link e acompanhe cada amigo aqui.">
            {friends.map((f) => <FriendRow key={f.id} name={f.name} status={f.status} statusLabel={statusLabels[f.status]} when={whenFor(f.status)} selected={f.id === sel} onSelect={() => setSel(f.id)} />)}
          </FriendList>
          {cur ? <FriendDetail name={cur.name} status={cur.status} statusLabel={statusLabels[cur.status]} steps={timeline(cur.status)} doneLabel="concluído" text={detailText[cur.status]} /> : null}
        </div>
      </div>
    </div>
  );
}
export const MapaEmAndamento: S = { render: () => <MapDemo friends={friendsAndamento} /> };
export const MapaMuitosAmigos: S = { render: () => <MapDemo friends={friendsMuitos} /> };
export const MapaVazio: S = { render: () => <MapDemo friends={[]} /> };
export const MapaCarregando: S = { render: () => <ReferralMap friends={[]} {...mapText} loadingLabel="Carregando" /> };

function TrackerDemo() {
  const steps = [{ id: '1', label: 'Criar a conta' }, { id: '2', label: 'Criar o primeiro mapa' }, { id: '3', label: 'Vocês dois ganham 1 mês de Pro' }];
  const [c, setC] = useState(1);
  return (
    <div className="flex max-w-[640px] flex-col items-start gap-4">
      <ProgressTracker aria-label="Seu progresso" steps={steps} current={c} doneLabel="concluído" />
      {c === 1 ? <button type="button" className="min-h-11 rounded-[13px] bg-primary px-4 font-bold text-on-primary" onClick={() => setC(2)}>Criar conta</button> : <SuccessRing />}
    </div>
  );
}
/** Convite (FR-14): 3 cartões que mudam de cor em 400 ms; ao criar a conta aparece o anel que se desenha (900 ms) e o check (500 ms, atraso 750 ms). */
export const AcompanhamentoDoConvite: S = { render: () => <TrackerDemo /> };

export const Heroi: S = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="p-8"><ReferralHero eyebrow="Indique e ganhe" titleBefore="Você e seu amigo ganham " titleHighlight="1 mês de Pro." subtitle="Quando seu amigo criar o primeiro mapa pelo seu link, vocês dois ganham 1 mês de Pro." primary={{ label: 'Convidar agora', href: '#compartilhar' }} secondary={{ label: 'Como funciona', href: '#como' }} art={heroArt} /></div>,
};
