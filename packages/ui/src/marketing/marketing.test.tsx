import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';
import { violations } from '../test-utils';
import {
  BentoTile, CompareMark, FeatureComparison, FeatureExplorer, Marquee, PlanCards, ProgressLine, QuestionAccordion,
  Reveal, Section, SiteFooter, SiteHeader, StepCard, WaitlistForm, formatBRL, type PlanCardPeriod, type WaitlistState,
} from './index';

const setNarrow = (matches: boolean) => {
  window.matchMedia = ((q: string) => ({ matches, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
};
beforeEach(() => setNarrow(false));

describe('Section / Reveal / StepCard / BentoTile', () => {
  it('liga o título por aria-labelledby, rola 92 px e tem axe limpo', async () => {
    const { container } = render(
      <main>
        <Section id="recursos" eyebrow="Recursos" title="Tudo" lead="Lead" tone="dark"><p>filho</p></Section>
        <StepCard number="01" title="Conectar" text="texto" thumbnail={<span />} />
        <ProgressLine />
        <BentoTile title="Anki" text="t" image={<img src="/a.svg" alt="x" width={640} height={420} />} />
      </main>,
    );
    expect(screen.getByRole('region', { name: 'Tudo' })).toHaveAttribute('id', 'recursos');
    expect(screen.getByRole('region', { name: 'Tudo' }).className).toContain('scroll-mt-[92px]');
    expect(screen.getByRole('heading', { level: 2, name: 'Tudo' })).toHaveAttribute('id', 'recursos-title');
    expect(screen.getByText('filho')).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
  it('Reveal deixa o conteúdo visível por padrão e expõe o gancho', () => {
    render(<Reveal delay={120}><p>oi</p></Reveal>);
    const el = screen.getByText('oi').parentElement!;
    expect(el).toHaveAttribute('data-reveal-target');
    expect(el).not.toHaveAttribute('data-reveal');
    expect(el.style.getPropertyValue('--mk-delay')).toBe('120ms');
  });
});

describe('Marquee', () => {
  it('trilha aria-hidden, botão pausa e retoma', async () => {
    const { container } = render(<Marquee items={['A', 'B']} label="Mapas" pauseLabel="Pausar" playLabel="Retomar" speedSeconds={20} />);
    const track = container.querySelector('.mk-marquee-track') as HTMLElement;
    expect(track.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(track.style.animationDuration).toBe('20s');
    expect(track).not.toHaveAttribute('data-paused');
    await userEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    expect(track).toHaveAttribute('data-paused');
    expect(screen.getByRole('button', { name: 'Retomar' })).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
});

const items = ['a', 'b', 'c'].map((id, i) => ({
  id, title: `Recurso ${i + 1}`, description: `Desc ${id}`, benefits: ['x1', 'x2', 'x3'].map((b) => `${b}${id}`),
  image: { src: `/${id}.svg`, alt: `Alt ${id}`, width: 640 as const, height: 420 as const },
}));

describe('FeatureExplorer', () => {
  it('abas: roving tabindex, setas, Home/End, aria-controls e onChange', async () => {
    const onChange = vi.fn();
    const { container } = render(<FeatureExplorer items={items} tablistLabel="Recursos" onChange={onChange} />);
    const tabs = screen.getAllByRole('tab');
    expect(screen.getByRole('tablist', { name: 'Recursos' })).toBeInTheDocument();
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel');
    expect(tabs[0]).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAccessibleName('Recurso 1');
    expect(within(panel).getByRole('img', { name: 'Alt a' })).toHaveAttribute('loading', 'lazy');
    tabs[0]!.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(tabs[1]).toHaveFocus();
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(onChange).toHaveBeenLastCalledWith('b');
    expect(screen.getByRole('img', { name: 'Alt b' })).toHaveClass('pop');
    await userEvent.keyboard('{End}');
    expect(tabs[2]).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(tabs[0]).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(tabs[2]).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(tabs[0]).toHaveFocus();
    expect(await violations(container)).toEqual([]);
  });
  it('só o item ativo é lido (inert nos demais)', () => {
    render(<FeatureExplorer items={items} tablistLabel="Recursos" activeId="b" />);
    expect(screen.getByText('Desc b').closest('[inert]')).toBeNull();
    expect(screen.getByText('Desc a', { selector: 'p' }).closest('[inert]')).not.toBeNull();
  });
  it('abaixo de 768 px vira acordeão com a imagem no item', async () => {
    setNarrow(true);
    const { container } = render(<FeatureExplorer items={items} tablistLabel="Recursos" />);
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByRole('tabpanel')).toBeNull();
    const b = screen.getAllByRole('button');
    expect(b[0]).toHaveAttribute('aria-expanded', 'true');
    expect(b[1]).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByRole('img')).toHaveLength(1);
    await userEvent.click(b[1]!);
    expect(b[1]).toHaveAttribute('aria-expanded', 'true');
    expect(b[0]).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('img', { name: 'Alt b' })).toBeInTheDocument();
    await userEvent.click(b[1]!);
    expect(b[1]).toHaveAttribute('aria-expanded', 'false');
    expect(await violations(container)).toEqual([]);
  });
});

describe('FeatureComparison', () => {
  it('tabela semântica, th scope e coluna destacada', async () => {
    const { container } = render(
      <FeatureComparison
        caption="Comparação" columns={['Remoa', 'Anki', 'Notion']} scrollLabel="Role para ver a tabela" highlightColumn={0}
        rows={[{ feature: 'Revisão', cells: [<CompareMark key="a" kind="brand" label="Sim" />, <CompareMark key="b" kind="yes" label="Sim" />, <CompareMark key="c" kind="no" label="Não" />] }]}
      />,
    );
    expect(screen.getByRole('table', { name: 'Comparação' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Remoa' })).toHaveAttribute('scope', 'col');
    expect(screen.getByRole('rowheader', { name: 'Revisão' })).toHaveAttribute('scope', 'row');
    const region = screen.getByRole('region', { name: 'Role para ver a tabela' });
    expect(region).toHaveAttribute('tabindex', '0');
    const cells = container.querySelectorAll('td');
    expect(cells[0]!.className).toContain('bg-primary-tint');
    expect(cells[1]!.className).not.toContain('bg-primary-tint');
    expect(await violations(container)).toEqual([]);
  });
});

describe('PlanCards', () => {
  it('formata BRL', () => {
    expect(formatBRL(0)).toMatch(/^R\$\s0$/);
    expect(formatBRL(39)).toMatch(/^R\$\s39,00$/);
  });
  function Host() {
    const [period, setPeriod] = useState<PlanCardPeriod>('monthly');
    return (
      <PlanCards
        period={period} onPeriodChange={setPeriod} periodLabels={{ monthly: 'Mensal', annual: 'Anual' }} periodGroupLabel="Período" discountLabel="-25%"
        plans={[
          { name: 'Free', price: { amount: 0, currency: 'BRL' }, cadence: '', features: ['a'], cta: <a href="#cta">Começar</a> },
          { name: 'Pro', price: { amount: period === 'monthly' ? 39 : 349, currency: 'BRL' }, cadence: period === 'monthly' ? '/mês' : '/ano', note: 'nota', features: ['b'], cta: <a href="#cta">Assinar</a>, dark: true, badge: 'Fundador' },
        ]}
      />
    );
  }
  it('alterna o período, move o marcador e troca o preço', async () => {
    const { container } = render(<Host />);
    const monthly = screen.getByRole('button', { name: 'Mensal' });
    const annual = screen.getByRole('button', { name: /Anual/ });
    expect(monthly).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/39,00/)).toHaveClass('pop');
    expect(container.querySelector('[class*="translate-x-0"]')).not.toBeNull();
    await userEvent.click(annual);
    expect(annual).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/349,00/)).toBeInTheDocument();
    expect(screen.getByText('/ano')).toBeInTheDocument();
    expect(container.querySelector('[class*="translate-x-full"]')).not.toBeNull();
    expect(screen.getByText('-25%')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Pro' }).className).toContain('bg-panel-dark');
    expect(screen.getByText('nota')).toHaveAttribute('aria-live', 'polite');
    expect(await violations(container)).toEqual([]);
  });
});

describe('QuestionAccordion', () => {
  const qs = [1, 2, 3].map((n) => ({ id: `q${n}`, question: `Pergunta ${n}`, answer: `Resposta ${n}` }));
  it('um aberto por vez, primeiro aberto, onToggle e região por pergunta', async () => {
    const onToggle = vi.fn();
    const { container } = render(<QuestionAccordion items={qs} defaultOpenId="q1" onToggle={onToggle} />);
    const b = screen.getAllByRole('button');
    expect(b.map((x) => x.getAttribute('aria-expanded'))).toEqual(['true', 'false', 'false']);
    expect(screen.getByRole('region', { name: 'Pergunta 1' })).toHaveTextContent('Resposta 1');
    await userEvent.click(b[1]!);
    expect(b.map((x) => x.getAttribute('aria-expanded'))).toEqual(['false', 'true', 'false']);
    expect(onToggle).toHaveBeenLastCalledWith('q2', true);
    await userEvent.click(b[1]!);
    expect(b[1]).toHaveAttribute('aria-expanded', 'false');
    expect(b[0]!.querySelector('span[aria-hidden]')!.className).not.toContain('rotate-45');
    expect(await violations(container)).toEqual([]);
  });
  it('singleOpen=false mantém vários abertos', async () => {
    render(<QuestionAccordion items={qs} singleOpen={false} />);
    const b = screen.getAllByRole('button');
    await userEvent.click(b[0]!);
    await userEvent.click(b[1]!);
    expect(b.map((x) => x.getAttribute('aria-expanded'))).toEqual(['true', 'true', 'false']);
  });
});

describe('WaitlistForm', () => {
  const segs = [{ value: 'ciclo-basico', label: '3º–4º ano' }, { value: 'internato', label: '5º–6º ano' }, { value: 'formado', label: 'Formado(a)' }];
  function Host({ state, onSubmit = vi.fn(), error }: { state: WaitlistState; onSubmit?: (v: unknown) => void; error?: string }) {
    const [email, setEmail] = useState('');
    const [segment, setSegment] = useState('internato');
    return (
      <WaitlistForm
        state={state} email={email} onEmailChange={setEmail} segment={segment} onSegmentChange={setSegment} onSubmit={onSubmit}
        emailLabel="Seu e-mail" emailPlaceholder="seu@email.com" segmentLabel="Seu momento" segments={segs} submitLabel="Entrar na lista" submittingLabel="Enviando"
        error={error} successTitle="Você está na lista." successText="Avisamos." resetLabel="Usar outro e-mail" onReset={() => undefined} honeypotLabel="Deixe em branco"
      />
    );
  }
  it('envia e-mail, segmento e honeypot; axe limpo', async () => {
    const onSubmit = vi.fn();
    const { container } = render(<Host state="idle" onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Seu e-mail'), 'a@b.co');
    await userEvent.click(screen.getByRole('radio', { name: 'Formado(a)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Entrar na lista' }));
    expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.co', segment: 'formado', honeypot: '' });
    const hp = container.querySelector('input[name="website"]') as HTMLInputElement;
    expect(hp).toHaveAttribute('tabindex', '-1');
    expect(hp.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByRole('radio', { name: '5º–6º ano' })).not.toBeChecked();
    expect(await violations(container)).toEqual([]);
  });
  it('enviando desabilita o botão; erro é anunciado e ligado ao campo', async () => {
    const { rerender, container } = render(<Host state="submitting" />);
    expect(screen.getByRole('button', { name: 'Enviando' })).toBeDisabled();
    rerender(<Host state="error" error="E-mail inválido" />);
    expect(screen.getByRole('alert')).toHaveTextContent('E-mail inválido');
    expect(screen.getByLabelText('Seu e-mail')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Seu e-mail')).toHaveAccessibleDescription('E-mail inválido');
    expect(await violations(container)).toEqual([]);
  });
  it('sucesso: status polite, foco no bloco, anel e check desenhados', async () => {
    const { container } = render(<Host state="success" />);
    const ok = screen.getByRole('status');
    expect(ok).toHaveAttribute('aria-live', 'polite');
    expect(ok).toHaveFocus();
    expect(container.querySelector('.draw')).not.toBeNull();
    expect(container.querySelector('.drawc')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Usar outro e-mail' })).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
});

describe('SiteHeader / SiteFooter', () => {
  function Header({ onToggle }: { onToggle?: (o: boolean) => void }) {
    return (
      <>
        <button type="button">antes</button>
        <SiteHeader brand={<a href="#topo" aria-label="Remoa, início">remoa</a>} navLabel="Principal" menuLabel="Abrir menu" onToggleMenu={onToggle}
          links={[{ href: '#a', label: 'Recursos', active: true }, { href: '#b', label: 'Planos' }]} actions={<a href="#cta">Criar mapa</a>} />
      </>
    );
  }
  it('fixo em 76 px; menu abre, prende o foco, Esc fecha e devolve o foco', async () => {
    const onToggle = vi.fn();
    const { container } = render(<Header onToggle={onToggle} />);
    expect(screen.getByRole('banner').className).toContain('h-[76px]');
    expect(screen.getByRole('banner').className).toContain('fixed');
    expect(screen.getAllByRole('link', { name: 'Recursos' })[0]).toHaveAttribute('aria-current', 'location');
    const menu = screen.getByRole('button', { name: 'Abrir menu' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(menu);
    expect(onToggle).toHaveBeenLastCalledWith(true);
    const sheet = screen.getByRole('dialog', { name: 'Abrir menu' });
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    expect(sheet.contains(document.activeElement)).toBe(true);
    // foco preso: Tab percorre o botão e a folha, sem sair do cabeçalho
    for (let i = 0; i < 8; i++) {
      await userEvent.tab();
      expect(screen.getByRole('banner').contains(document.activeElement)).toBe(true);
    }
    expect(await violations(container)).toEqual([]);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onToggle).toHaveBeenLastCalledWith(false);
    expect(menu).toHaveFocus();
  });
  it('rodapé com grupos, aviso e axe limpo', async () => {
    const { container } = render(
      <SiteFooter brand={<span>remoa</span>} tagline="Conecte para lembrar." navLabel="Rodapé" disclaimer="Ferramenta de estudo." copyright="© 2026"
        links={[{ title: 'Produto', items: [{ href: '#a', label: 'Recursos' }] }, { title: 'Legal', items: [{ href: '/termos', label: 'Termos' }] }]} />,
    );
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Ferramenta de estudo.');
    expect(screen.getByRole('navigation', { name: 'Rodapé' })).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
});
