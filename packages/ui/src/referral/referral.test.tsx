import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReferralCopyField, ShareChannels, ChipInput, RewardStat, ReferralMap, ReferralLegend, FriendList, FriendRow, FriendDetail, ProgressTracker, ProgressTimeline, SuccessRing, ReferralHero, useCountTo } from './index';
import { friendsAndamento, friendsMuitos, heroArt, statusLabels } from './fixtures';
import { violations } from '../test-utils';
import { useState } from 'react';

const copyProps = { label: 'Seu link', copyLabel: 'Copiar link', copiedLabel: 'Copiado', deniedLabel: 'Não foi possível copiar.' };
const url = 'remoa.app/i/4K2F-9QXM';

describe('ReferralCopyField', () => {
  afterEach(() => vi.useRealTimers());
  it('copia, vira "Copiado" por 2,2 s, anuncia por aria-live e volta', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const onCopy = vi.fn();
    const { container } = render(<ReferralCopyField value={url} {...copyProps} onCopy={onCopy} />);
    expect(await violations(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Copiar link' }));
    expect(writeText).toHaveBeenCalledWith(url);
    expect(onCopy).toHaveBeenCalledWith('clipboard');
    expect(screen.getByRole('button', { name: 'Copiado' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Copiado');
    act(() => { vi.advanceTimersByTime(2100); });
    expect(screen.getByRole('button', { name: 'Copiado' })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByRole('button', { name: 'Copiar link' })).toBeInTheDocument();
  });
  it('sem clipboard, seleciona o texto e usa execCommand; se falhar, mostra o aviso', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('negado')) }, configurable: true });
    document.execCommand = vi.fn().mockReturnValue(true);
    const onCopy = vi.fn();
    const { rerender } = render(<ReferralCopyField value={url} {...copyProps} onCopy={onCopy} />);
    await userEvent.click(screen.getByRole('button', { name: 'Copiar link' }));
    expect(onCopy).toHaveBeenLastCalledWith('selection');
    expect(screen.getByRole('button', { name: 'Copiado' })).toBeInTheDocument();
    document.execCommand = vi.fn().mockReturnValue(false);
    rerender(<ReferralCopyField value="outro" {...copyProps} onCopy={onCopy} />);
    await userEvent.click(screen.getByRole('button', { name: /Copiado|Copiar link/ }));
    expect(onCopy).toHaveBeenLastCalledWith('denied');
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível copiar.');
  });
});

describe('ShareChannels', () => {
  it('chama o canal escolhido; sem violações axe', async () => {
    const onShare = vi.fn();
    const { container } = render(<ShareChannels aria-label="Compartilhar" channels={[{ id: 'whatsapp', label: 'WhatsApp' }, { id: 'telegram', label: 'Telegram' }, { id: 'email', label: 'E-mail' }, { id: 'more', label: 'Mais opções' }]} onShare={onShare} />);
    expect(await violations(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Telegram' }));
    expect(onShare).toHaveBeenCalledWith('telegram');
    expect(within(screen.getByRole('group', { name: 'Compartilhar' })).getAllByRole('button')).toHaveLength(4);
  });
});

const chip = {
  label: 'E-mail do amigo', placeholder: 'amigo@email.com', addLabel: 'Adicionar', removeLabel: (e: string) => `Remover ${e}`,
  sendLabel: (n: number) => `Enviar ${n} ${n === 1 ? 'convite' : 'convites'}`,
  messages: { invalid: 'Digite um e-mail válido.', duplicate: 'Esse e-mail já está na lista.', max: 'Até 5 por vez.' },
};
function ChipDemo(p: { onSend?: (e: string[]) => void; error?: string; onRetry?: () => void; limitReached?: boolean }) {
  const [emails, setEmails] = useState<string[]>([]);
  return <ChipInput {...chip} emails={emails} onEmailsChange={setEmails} onSend={p.onSend ?? (() => undefined)} error={p.error} retryLabel="Tentar de novo" onRetry={p.onRetry} limitReached={p.limitReached} />;
}
describe('ChipInput', () => {
  it('valida, impede duplicado, limita a 5, remove e envia', async () => {
    const onSend = vi.fn();
    const { container } = render(<ChipDemo onSend={onSend} />);
    const input = screen.getByRole('textbox', { name: 'E-mail do amigo' });
    await userEvent.type(input, 'errado{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Digite um e-mail válido.');
    await userEvent.clear(input);
    await userEvent.type(input, 'a@x.com{Enter}');
    await userEvent.type(input, 'A@x.com{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Esse e-mail já está na lista.');
    await userEvent.clear(input);
    for (const e of ['b@x.com', 'c@x.com', 'd@x.com', 'e@x.com']) await userEvent.type(input, `${e}{Enter}`);
    await userEvent.type(input, 'f@x.com{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Até 5 por vez.');
    expect(await violations(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Remover e@x.com' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar 4 convites' }));
    expect(onSend).toHaveBeenCalledWith(['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com']);
  });
  it('erro tem "Tentar de novo"; limite diário desabilita adicionar e esconde o retry', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<ChipDemo error="Falhou." onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onRetry).toHaveBeenCalled();
    rerender(<ChipDemo error="Limite diário." onRetry={onRetry} limitReached />);
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeDisabled();
  });
});

const reward = { label: 'Seu Pro grátis', unitOne: 'mês', unitMany: 'meses', emptyText: 'Nenhum mês ainda.', historyTitle: 'Últimas recompensas', historyEmpty: 'As recompensas aparecem aqui.', history: [{ id: 'a', title: '+1 mês de Pro', detail: 'Ana C. · 28 set' }], note: 'Nota.' };
describe('RewardStat', () => {
  afterEach(() => { vi.useRealTimers(); delete document.documentElement.dataset.motion; });
  it('conta 40 ms por passo, 14 passos por mês', () => {
    vi.useFakeTimers();
    render(<RewardStat {...reward} months={2} untilText="Pro grátis até 3 de dezembro" days={{ left: 61, total: 61, text: 'Faltam 61 dias' }} />);
    expect(screen.getByTestId('reward-months')).toHaveTextContent('0');
    act(() => { vi.advanceTimersByTime(40 * 14); });
    expect(screen.getByTestId('reward-months')).toHaveTextContent('1');
    act(() => { vi.advanceTimersByTime(40 * 14); });
    expect(screen.getByTestId('reward-months')).toHaveTextContent('2');
    expect(screen.getByText('meses')).toBeInTheDocument();
    expect(screen.getByText('Faltam 61 dias')).toBeInTheDocument();
  });
  it('movimento reduzido (data-motion): mostra o valor final direto', () => {
    document.documentElement.dataset.motion = 'reduced';
    render(<RewardStat {...reward} months={3} />);
    expect(screen.getByTestId('reward-months')).toHaveTextContent('3');
  });
  it('vazio, histórico vazio e carregando; axe', async () => {
    const { container, rerender } = render(<RewardStat {...reward} months={0} history={[]} />);
    expect(screen.getByText('Nenhum mês ainda.')).toBeInTheDocument();
    expect(screen.getByText('As recompensas aparecem aqui.')).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
    rerender(<RewardStat {...reward} months={0} history={[]} loadingLabel="Carregando" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });
  it('useCountTo parte do valor anterior ao somar um mês', () => {
    vi.useFakeTimers();
    function C({ n }: { n: number }) { return <span data-testid="n">{useCountTo(n, false)}</span>; }
    const { rerender } = render(<C n={2} />);
    act(() => { vi.advanceTimersByTime(40 * 28); });
    rerender(<C n={3} />);
    act(() => { vi.advanceTimersByTime(40 * 7); });
    expect(screen.getByTestId('n').textContent).toBe('3'); // 2,5 arredonda para 3
    act(() => { vi.advanceTimersByTime(40 * 7); });
    expect(screen.getByTestId('n')).toHaveTextContent('3');
  });
});

const mapText = { youLabel: 'Você', badgeLabel: '+1 mês', inviteLabel: 'Convidar' };
describe('ReferralMap, lista e detalhe', () => {
  it('mapa é aria-hidden, seleção sincronizada com a lista', async () => {
    function Demo() {
      const [sel, setSel] = useState('carla');
      return (
        <>
          <ReferralMap friends={friendsAndamento} selectedId={sel} onSelect={setSel} {...mapText} />
          <FriendList aria-label="Amigos" emptyText="Vazio">
            {friendsAndamento.map((f) => <FriendRow key={f.id} name={f.name} status={f.status} statusLabel={statusLabels[f.status]} when="1 out" selected={f.id === sel} onSelect={() => setSel(f.id)} />)}
          </FriendList>
        </>
      );
    }
    const { container } = render(<Demo />);
    expect(screen.getByTestId('referral-map')).toHaveAttribute('aria-hidden', 'true');
    expect(await violations(container)).toEqual([]);
    const list = screen.getByRole('list', { name: 'Amigos' });
    expect(within(list).getAllByRole('button')).toHaveLength(4);
    expect(within(list).getByRole('button', { name: /Carla S\./ })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(within(list).getByRole('button', { name: /Ana C\./ }));
    expect(within(list).getByRole('button', { name: /Ana C\./ })).toHaveAttribute('aria-pressed', 'true');
    const nodes = Array.from(container.querySelectorAll('[data-testid="referral-map"] button'));
    expect(nodes.filter((n) => n.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect((nodes[0] as HTMLElement).style.transform).toContain('scale(1.14)');
    await userEvent.click(nodes[1] as HTMLElement); // clicar no nó = mesma ação
    expect(within(list).getByRole('button', { name: /Bruno M\./ })).toHaveAttribute('aria-pressed', 'true');
  });
  it('estilos por estado: aresta sólida (marca), âmbar e tracejada; selo só no primeiro mapa; máx. 8 nós', () => {
    const { container } = render(<ReferralMap friends={[...friendsMuitos, { id: 'x', name: 'Extra', status: 'invited' }]} {...mapText} />);
    expect(container.querySelectorAll('[data-testid="referral-map"] button')).toHaveLength(8);
    expect(container.querySelectorAll('[data-edge="invited"] path[stroke-dasharray="6 8"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-edge="qualified"] path[stroke="var(--primary)"]')).toHaveLength(6);
    expect(container.querySelectorAll('[data-edge="signed_up"] path[stroke="var(--state-watch-border)"]')).toHaveLength(1);
    expect(screen.getAllByText('+1 mês')).toHaveLength(6);
  });
  it('vazio: 3 nós "Convidar" acessíveis que levam ao cartão do link; carregando', () => {
    const onInvite = vi.fn();
    const { rerender } = render(<ReferralMap friends={[]} {...mapText} inviteHref="#compartilhar" onInvite={onInvite} />);
    const links = screen.getAllByRole('link', { name: 'Convidar' });
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute('href', '#compartilhar');
    rerender(<ReferralMap friends={[]} {...mapText} loadingLabel="Carregando" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
  it('legenda, lista vazia e detalhe com linha do tempo', async () => {
    const { container } = render(
      <>
        <ReferralLegend items={[{ status: 'qualified', label: '2 com o 1º mapa' }, { status: 'signed_up', label: '1 cadastrou' }, { status: 'invited', label: '1 convite' }]} />
        <FriendList aria-label="Amigos" emptyText="Você ainda não convidou ninguém." />
        <FriendDetail name="Carla S." status="signed_up" statusLabel="Cadastrou" doneLabel="concluído" text="Falta o primeiro mapa." steps={[{ id: '0', label: 'Convite enviado', done: true }, { id: '1', label: 'Criou a conta', done: true }, { id: '2', label: 'Criou o primeiro mapa', done: false }]} />
      </>,
    );
    expect(screen.getByText('Você ainda não convidou ninguém.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(6);
    expect(screen.getByRole('region', { name: 'Carla S.' })).toBeInTheDocument();
    expect(screen.getByText(/Criou a conta/)).toHaveTextContent('concluído');
    expect(await violations(container)).toEqual([]);
  });
});

describe('ProgressTracker e SuccessRing', () => {
  const steps = [{ id: '1', label: 'Criar a conta' }, { id: '2', label: 'Criar o primeiro mapa' }, { id: '3', label: 'Vocês dois ganham 1 mês de Pro' }];
  it('passo atual com aria-current; concluídos anunciados; axe', async () => {
    const { container, rerender } = render(<ProgressTracker aria-label="Seu progresso" steps={steps} current={1} doneLabel="concluído" />);
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Criar a conta');
    rerender(<ProgressTracker aria-label="Seu progresso" steps={steps} current={2} doneLabel="concluído" />);
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Criar o primeiro mapa');
    expect(screen.getByText(/Criar a conta/)).toHaveTextContent('concluído');
    expect(await violations(container)).toEqual([]);
  });
  it('anel de sucesso desenha (classes draw/drawc) e é decorativo', () => {
    const { container } = render(<SuccessRing />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.draw')).toBeInTheDocument();
    expect(container.querySelector('.drawc')).toBeInTheDocument();
  });
  it('linha do tempo: marca só os passos concluídos', () => {
    render(<ProgressTimeline status="qualified" doneLabel="concluído" steps={[{ id: '0', label: 'A', done: true }, { id: '1', label: 'B', done: false }]} />);
    expect(screen.getByText('A')).toHaveTextContent('concluído');
    expect(screen.getByText('B')).not.toHaveTextContent('concluído');
  });
});

describe('ReferralHero', () => {
  it('título, CTAs e ilustração decorativa; axe', async () => {
    const { container } = render(<ReferralHero eyebrow="Indique e ganhe" titleBefore="Você e seu amigo ganham " titleHighlight="1 mês de Pro." subtitle="Sub." primary={{ label: 'Convidar agora', href: '#compartilhar' }} secondary={{ label: 'Como funciona', href: '#como' }} art={heroArt} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Você e seu amigo ganham 1 mês de Pro.');
    expect(screen.getByRole('link', { name: 'Convidar agora' })).toHaveAttribute('href', '#compartilhar');
    expect(screen.getByTestId('referral-hero-art')).toHaveAttribute('aria-hidden', 'true');
    expect(await violations(container)).toEqual([]);
  });
});
