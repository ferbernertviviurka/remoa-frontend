import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppRail, RailAccount, RailItem } from './app-rail';
import { Ring } from './ring';
import { Hero } from './hero';
import { Constellation } from './constellation';
import { MapTile } from './map-tile';
import { FilterChip } from './filter-chip';
import { ViewToggle } from './view-toggle';
import { Stepper } from './stepper';
import { ChoiceCard, ChoiceRow } from './choice-card';
import { Dropzone } from './dropzone';
import { Input } from './input';
import { Button } from './button';
import { IconButton } from './icon-button';
import { Icon } from './icons';
import { ToastProvider, useToast } from './toast';
import { Segmented } from './segmented';
import { StateBar } from './state-bar';
import { constellationEdges, constellationNodes, sepsePreview } from './fixtures-v2';
import { violations } from './test-utils';

const counts = { review: 2, watch: 2, steady: 1, unknown: 1 };

describe('AppRail', () => {
  const ui = (onRevisar = vi.fn()) => (
    <AppRail aria-label="Principal" logo={<a href="#" aria-label="Remoa">logo</a>} account={<RailAccount aria-label="Minha conta" />}>
      <RailItem icon="home" label="Hoje" href="#hoje" active />
      <RailItem icon="bolt" label="Revisar" badge={12} badgeLabel="12 revisões vencidas" onClick={onRevisar} />
    </AppRail>
  );
  it('ativo recebe aria-current, badge fala pelo badgeLabel, sem violações axe', async () => {
    const { container } = render(ui());
    expect(screen.getByRole('link', { name: 'Hoje' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /Revisar.*12 revisões vencidas/ })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
  it('item sem href é botão e dispara onClick', async () => {
    const fn = vi.fn();
    render(ui(fn));
    await userEvent.click(screen.getByRole('button', { name: /Revisar/ }));
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('Ring / Hero / Constellation', () => {
  it('Ring: arco proporcional ao valor; rótulo vira img', () => {
    render(<Ring value={3} max={15} label="3 de 15" />);
    expect(screen.getByRole('img', { name: '3 de 15' })).toBeInTheDocument();
    expect(screen.getByTestId('ring-arc').getAttribute('stroke-dasharray')).toBe('26.4 131.9');
  });
  it('Hero: seção rotulada pelo título; ações e progresso renderizam; axe', async () => {
    const { container } = render(
      <Hero eyebrow="Revisão de hoje" title="4 mapas" description="Texto" actions={<Button variant="light" size="hero">Começar</Button>} progress={{ value: 3, max: 15, title: '3 de 15', caption: 'revisados hoje' }}>
        <Constellation nodes={constellationNodes} edges={constellationEdges} />
      </Hero>,
    );
    expect(screen.getByRole('region', { name: '4 mapas' })).toBeInTheDocument();
    expect(screen.getByText('revisados hoje')).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
  it('Constellation: decorativa, nós pulsantes só nos vencidos, uma linha por aresta', () => {
    const { container } = render(<Constellation nodes={constellationNodes} edges={constellationEdges} />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('.pulsed')).toHaveLength(2);
    expect(container.querySelectorAll('line')).toHaveLength(6);
  });
});

describe('MapTile / StateBar', () => {
  const tile = (extra = {}) => (
    <MapTile href="#m" aria-label="Abrir o mapa Sepse" area="Clínica Médica" title="Sepse" preview={sepsePreview} counts={counts} stateBarLabel="Estados" meta="6 cards · 6 conexões" due={{ text: '2 vencem hoje', tone: 'review' }} {...extra} />
  );
  it('é um link inteiro com nome, mostra dados e axe', async () => {
    const { container } = render(tile());
    expect(screen.getByRole('link', { name: 'Abrir o mapa Sepse' })).toHaveAttribute('href', '#m');
    expect(screen.getByText('2 vencem hoje')).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
  it('linha "salvo" só no tamanho md', () => {
    const { rerender } = render(tile({ saved: 'Salvo há 3 min' }));
    expect(screen.queryByText('Salvo há 3 min')).not.toBeInTheDocument();
    rerender(tile({ saved: 'Salvo há 3 min', size: 'md' }));
    expect(screen.getByText('Salvo há 3 min')).toBeInTheDocument();
  });
  it('StateBar: "sem revisões" usa o cinza suave', () => {
    const { container } = render(<StateBar counts={counts} aria-label="x" />);
    expect(container.querySelector('[data-state="unknown"]')?.className).toContain('bg-unknown-soft');
  });
});

describe('FilterChip / ViewToggle / Segmented', () => {
  it('FilterChip: aria-pressed, contador e clique', async () => {
    const fn = vi.fn();
    const { container } = render(<FilterChip pressed count={5} onClick={fn}>Todos</FilterChip>);
    const b = screen.getByRole('button', { name: /Todos/ });
    expect(b).toHaveAttribute('aria-pressed', 'true');
    expect(b).toHaveTextContent('5');
    await userEvent.click(b);
    expect(fn).toHaveBeenCalledOnce();
    expect(await violations(container)).toEqual([]);
  });
  it('ViewToggle: botões nomeados, aria-pressed no valor e onValueChange', async () => {
    const fn = vi.fn();
    const { container } = render(<ViewToggle aria-label="Visualização" value="grid" onValueChange={fn} options={[{ value: 'grid', label: 'Ver em grade', icon: 'grid' }, { value: 'list', label: 'Ver em lista', icon: 'list' }]} />);
    expect(screen.getByRole('button', { name: 'Ver em grade' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Ver em lista' }));
    expect(fn).toHaveBeenCalledWith('list');
    expect(await violations(container)).toEqual([]);
  });
  it('Segmented: axe e troca', async () => {
    const fn = vi.fn();
    const { container } = render(<Segmented aria-label="Modo" options={[{ value: 'a', label: 'Explorar' }, { value: 'b', label: 'Desafio' }]} defaultValue="a" onValueChange={fn} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Desafio' }));
    expect(fn).toHaveBeenCalledWith('b');
    expect(await violations(container)).toEqual([]);
  });
});

describe('Stepper / ChoiceCard / ChoiceRow / Dropzone', () => {
  it('Stepper: passo atual marcado, feitos com ✓ e texto de leitor de tela', async () => {
    const { container } = render(<Stepper aria-label="Passos" steps={['Início', 'Detalhes', 'Material']} current={1} doneLabel="concluído" />);
    expect(screen.getByRole('list', { name: 'Passos' })).toBeInTheDocument();
    expect(screen.getByText('Detalhes').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Início').closest('li')).toHaveTextContent('✓');
    expect(screen.getByText('concluído')).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
  it('ChoiceCard: aria-pressed e onSelect', async () => {
    const fn = vi.fn();
    const { container } = render(<ChoiceCard icon="file" tag="Rascunho" title="De um PDF" description="Envie" selected={false} onSelect={fn} />);
    const b = screen.getByRole('button', { name: /De um PDF/ });
    expect(b).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(b);
    expect(fn).toHaveBeenCalledOnce();
    expect(await violations(container)).toEqual([]);
  });
  it('ChoiceRow: radio/check, lg mostra título, descrição e selo', async () => {
    const fn = vi.fn();
    const { container } = render(<><ChoiceRow indicator="check" selected onSelect={fn}>Gerar fluxogramas</ChoiceRow><ChoiceRow size="lg" indicator="radio" selected={false} title="Sepse" description="42 cards" badge="Revisado" onSelect={fn} /></>);
    expect(screen.getByRole('button', { name: 'Gerar fluxogramas' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Sepse.*42 cards.*Revisado/ })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Gerar fluxogramas' }));
    expect(fn).toHaveBeenCalledOnce();
    expect(await violations(container)).toEqual([]);
  });
  it('Dropzone: escolher arquivo entrega os arquivos; com file mostra a linha e Trocar', async () => {
    const onFiles = vi.fn();
    const { container, rerender } = render(<Dropzone title="Arraste" description="ou escolha" buttonLabel="Escolher arquivo" accept=".pdf" onFiles={onFiles} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['x'], 'sepse.pdf', { type: 'application/pdf' }));
    expect(onFiles).toHaveBeenCalledOnce();
    expect(await violations(container)).toEqual([]);
    const swap = vi.fn();
    rerender(<Dropzone title="" description="" buttonLabel="" onFiles={onFiles} file={{ name: 'sepse.pdf', meta: '2,4 MB' }} replaceLabel="Trocar" onReplace={swap} />);
    await userEvent.click(screen.getByRole('button', { name: 'Trocar' }));
    expect(swap).toHaveBeenCalledOnce();
    expect(screen.getByText('2,4 MB')).toBeInTheDocument();
  });
});

describe('Button / IconButton / Input / Toast v2', () => {
  it('tamanhos v2 e variantes sobre fundo escuro', () => {
    render(<><Button size="sm">a</Button><Button>b</Button><Button size="lg">c</Button><Button size="hero" variant="light">d</Button></>);
    expect(screen.getByRole('button', { name: 'a' }).className).toContain('min-h-11');
    expect(screen.getByRole('button', { name: 'b' }).className).toContain('min-h-12');
    expect(screen.getByRole('button', { name: 'c' }).className).toContain('min-h-[52px]');
    expect(screen.getByRole('button', { name: 'd' }).className).toContain('min-h-[50px]');
  });
  it('IconButton tem 44 px por padrão', () => {
    render(<IconButton aria-label="Fechar"><Icon name="close" /></IconButton>);
    expect(screen.getByRole('button', { name: 'Fechar' }).className).toContain('size-11');
  });
  it('Input search: rótulo só para leitor de tela, type=search; axe', async () => {
    const { container } = render(<Input variant="search" label="Buscar mapa" placeholder="Buscar mapa" />);
    expect(screen.getByRole('searchbox', { name: 'Buscar mapa' })).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
  it('Toast escuro dispara e fecha', async () => {
    function Fire() {
      const { toast } = useToast();
      return <button onClick={() => toast({ title: 'Mapa salvo' })}>Disparar</button>;
    }
    const { container } = render(<ToastProvider closeLabel="Fechar aviso" viewportLabel="Avisos"><Fire /></ToastProvider>);
    await userEvent.click(screen.getByText('Disparar'));
    expect(await screen.findByText('Mapa salvo')).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByText('Mapa salvo')).not.toBeInTheDocument();
  });
});
