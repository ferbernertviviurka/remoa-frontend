import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { violations } from '../test-utils';
import { readFileSync } from 'node:fs';
import { NodeCard, nodeSize, shapeAnchor, type CardShape, type NodeType } from './node-card';
import { EdgeLabel } from './edge-label';
import { LayerSwitch } from './layer-switch';
import { Legend } from './legend';
import { CanvasToolbar } from './canvas-toolbar';
import { ZoomControl, stepZoom } from './zoom-control';
import { InspectorTabs, InspectorTabPanel } from './inspector-tabs';
import { RubricList } from './rubric-list';
import { QuestionPanel } from './question-panel';
import { VerdictBox } from './verdict-box';
import { RatingButton, RatingGroup } from './rating-button';
import { CommandPalette } from './command-palette';
import { EditorFixture } from './fixtures';

// Radix Tooltip (popper) mede com ResizeObserver, ausente no jsdom
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };

const node = { type: 'concept', typeLabel: 'Conceito', title: 'Sepse', selectLabel: 'Selecionar Sepse', layer: 'recall', state: 'review', footer: 'Revisitar · 58%' } as const;

describe('NodeCard', () => {
  it('article com um button real que cobre o card e seleciona', async () => {
    const onSelect = vi.fn();
    const { container } = render(<NodeCard {...node} summary="Resumo" onSelect={onSelect} />);
    const btn = screen.getByRole('button', { name: 'Selecionar Sepse' });
    expect(within(screen.getByRole('article')).getAllByRole('button')).toHaveLength(1);
    await userEvent.tab();
    expect(btn).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.click(btn);
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(await violations(container)).toEqual([]);
  });
  it('tamanhos por tipo', () => {
    const { rerender } = render(<NodeCard {...node} />);
    const cls = () => screen.getByRole('article').className;
    expect(cls()).toContain('w-[232px]');
    rerender(<NodeCard {...node} type="case" chips={[{ label: 'Exames', active: true }]} />);
    expect(cls()).toContain('h-[216px]');
    rerender(<NodeCard {...node} type="flow" steps={[{ text: 'a' }]} />);
    expect(cls()).toContain('h-[282px]');
    rerender(<NodeCard {...node} type="image" image={{ src: null, alt: 'Imagem' }} />);
    expect(cls()).toContain('h-[206px]');
    expect(screen.getByRole('img', { name: 'Imagem' })).toBeInTheDocument();
  });
  it('pulse só vencido + Lembrança + fora do desafio + sem seleção', () => {
    const has = () => screen.getByRole('article').className.includes('cv-pulse');
    const { rerender } = render(<NodeCard {...node} due />);
    expect(has()).toBe(true);
    rerender(<NodeCard {...node} />);
    expect(has()).toBe(false);
    rerender(<NodeCard {...node} due layer="structure" />);
    expect(has()).toBe(false);
    rerender(<NodeCard {...node} due challenge="target" />);
    expect(has()).toBe(false);
    rerender(<NodeCard {...node} due selected />);
    expect(has()).toBe(false);
  });
  it('desafio: opacidade 1 / 50% / 18%', () => {
    const { rerender } = render(<NodeCard {...node} challenge="target" />);
    expect(screen.getByRole('article').className).toContain('opacity-100');
    rerender(<NodeCard {...node} challenge="neighbor" />);
    expect(screen.getByRole('article').className).toContain('opacity-50');
    rerender(<NodeCard {...node} challenge="dim" />);
    expect(screen.getByRole('article').className).toContain('opacity-[.18]');
  });
  it('passos do fluxograma: numerados, passo oculto', () => {
    render(<NodeCard {...node} type="flow" steps={[{ text: 'Dosar lactato' }, { text: 'Passo oculto', tone: 'hidden' }]} />);
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['1Dosar lactato', '2Passo oculto']);
  });
});

describe('NodeCard formatos, verso e foco', () => {
  const flip = { back: 'Noradrenalina', flipLabel: 'Ver resposta', unflipLabel: 'Ver pergunta' };
  it('classes de tamanho batem com nodeSize (todos os formatos)', () => {
    for (const shape of ['rect', 'pill', 'circle', 'diamond', 'hexagon'] as CardShape[]) {
      const { unmount } = render(<NodeCard {...node} shape={shape} />);
      const { w, h } = nodeSize('concept', shape);
      expect(screen.getByRole('article').className).toContain(`w-[${w}px] h-[${h}px]`);
      unmount();
    }
    expect(nodeSize('concept', 'circle')).toEqual({ w: 180, h: 180 });
    expect(nodeSize('concept', 'rect', { frontImage: true }).h).toBe(240);
    expect(nodeSize('concept', 'diamond', { frontImage: true }).h).toBe(224);
    for (const t of ['case', 'flow', 'image'] as NodeType[]) expect(nodeSize(t, 'circle')).toEqual(nodeSize(t));
  });
  it('shape só vale em concept; shapeAnchor toca o meio do lado', () => {
    render(<NodeCard {...node} type="case" shape="circle" />);
    expect(screen.getByRole('article')).toHaveAttribute('data-shape', 'rect');
    expect(shapeAnchor('diamond', { x: 0, y: 0, w: 200, h: 100 }, 'r')).toEqual([200, 50]);
  });
  it('axe em cada formato', async () => {
    for (const shape of ['pill', 'circle', 'diamond', 'hexagon'] as CardShape[]) {
      const { container, unmount } = render(<NodeCard {...node} shape={shape} summary="x" />);
      expect(await violations(container)).toEqual([]);
      unmount();
    }
  });
  it('conteúdo decorativo não intercepta clique; botão de seleção recebe', () => {
    render(<NodeCard {...node} type="image" image={{ src: null, alt: 'Imagem' }} />);
    const img = screen.getByRole('img', { name: 'Imagem' });
    expect(img.closest('.pointer-events-none')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Selecionar Sepse' }).className).toContain('pointer-events-auto');
  });
  it('imagem na pergunta: placeholder e altura', () => {
    render(<NodeCard {...node} frontImage={{ src: null, alt: 'Pergunta' }} />);
    expect(screen.getByRole('img', { name: 'Pergunta' })).toBeInTheDocument();
    expect(screen.getByRole('article').style.height).toBe('240px');
  });
  it('diamond/hexagon: contorno SVG fica atrás do conteúdo e o botão de virar fica dentro do nó', () => {
    for (const shape of ['diamond', 'hexagon', 'circle', 'pill'] as CardShape[]) {
      const { container, unmount } = render(<NodeCard {...node} shape={shape} {...flip} />);
      const svg = container.querySelector('svg');
      if (shape === 'diamond' || shape === 'hexagon') {
        expect(svg?.getAttribute('class')).toContain('-z-10');
        expect(svg?.parentElement?.className).toContain('isolate');
        expect(screen.getByText('Sepse')).toBeVisible();
      }
      const cls = screen.getByRole('button', { name: 'Ver resposta' }).className;
      expect(cls).toMatch(/bottom-(\d|\[\d)/u);
      expect(cls).not.toContain('bottom-[-');
      unmount();
    }
  });
  it('sem back: sem botão de virar', () => {
    render(<NodeCard {...node} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
  it('virar por teclado: aria-pressed, rótulo, verso montado sob demanda, frente inerte', async () => {
    const onFlip = vi.fn();
    const { container, rerender } = render(<NodeCard {...node} {...flip} onFlip={onFlip} />);
    expect(screen.queryByText('Noradrenalina')).toBeNull();
    const btn = screen.getByRole('button', { name: 'Ver resposta' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    await userEvent.tab();
    await userEvent.tab();
    expect(btn).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onFlip).toHaveBeenCalledTimes(1);
    rerender(<NodeCard {...node} {...flip} flipped onFlip={onFlip} />);
    expect(screen.getByText('Noradrenalina')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver pergunta' })).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelectorAll('[inert]')).toHaveLength(1);
    expect(await violations(container)).toEqual([]);
  });
  it('desafio target: só a frente, sem botão de virar', () => {
    render(<NodeCard {...node} {...flip} flipped challenge="target" />);
    expect(screen.queryByText('Noradrenalina')).toBeNull();
    expect(screen.queryByRole('button', { name: /Ver /u })).toBeNull();
  });
  it('reduced-motion: .cv-flip sem transição no CSS', () => {
    const css = readFileSync('src/canvas/canvas.css', 'utf8');
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.cv-flip \{ transition: none; \}/u);
  });
});

describe('EdgeLabel v2', () => {
  it('pílula estática; com onClick vira botão', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<EdgeLabel label="evolui para" />);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<EdgeLabel label="evolui para" onClick={onClick} buttonLabel="Editar rótulo" />);
    await userEvent.click(screen.getByRole('button', { name: 'Editar rótulo' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('controles', () => {
  it('LayerSwitch troca a camada e marca aria-pressed', async () => {
    const onChange = vi.fn();
    const { container } = render(<LayerSwitch label="Camadas" value="recall" onChange={onChange} options={[{ value: 'structure', label: 'Estrutura' }, { value: 'recall', label: 'Lembrança' }]} />);
    expect(screen.getByRole('button', { name: 'Lembrança' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Estrutura' }));
    expect(onChange).toHaveBeenCalledWith('structure');
    expect(await violations(container)).toEqual([]);
  });
  it('Legend lista os 4 estados', async () => {
    const { container } = render(<Legend aria-label="Legenda" labels={{ review: 'Revisitar', watch: 'Acompanhar', steady: 'Mais estável', unknown: 'Sem revisões' }} />);
    expect(screen.getAllByRole('listitem').map((l) => l.textContent)).toEqual(['Revisitar', 'Acompanhar', 'Mais estável', 'Sem revisões']);
    expect(await violations(container)).toEqual([]);
  });
  it('CanvasToolbar: role toolbar, botões só-ícone com nome, setas movem foco', async () => {
    const onSelect = vi.fn();
    const { container } = render(<CanvasToolbar aria-label="Ferramentas" onSelect={onSelect} items={[{ id: 'select', icon: 'cursor', label: 'Selecionar', pressed: true }, { separator: true }, { id: 'move', icon: 'move', label: 'Mover o mapa' }]} />);
    expect(screen.getByRole('toolbar', { name: 'Ferramentas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Selecionar' })).toHaveAttribute('aria-pressed', 'true');
    screen.getByRole('button', { name: 'Selecionar' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'Mover o mapa' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('move');
    expect(await violations(container)).toEqual([]);
  });
  it('CanvasToolbar: tooltip com a explicação no hover e no foco, sem title nativo, sem violações', async () => {
    const items = [{ id: 'select', icon: 'cursor', label: 'Selecionar', hint: 'Selecionar: clique num card' }, { id: 'move', icon: 'move', label: 'Mover o mapa', hint: 'Mover o mapa: arraste o fundo' }] as const;
    const { container } = render(<CanvasToolbar aria-label="Ferramentas" onSelect={vi.fn()} items={items} />);
    expect(container.querySelector('[title]')).toBeNull();
    await userEvent.hover(screen.getByRole('button', { name: 'Selecionar' }));
    expect((await screen.findAllByText('Selecionar: clique num card')).length).toBeGreaterThan(0);
    await userEvent.unhover(screen.getByRole('button', { name: 'Selecionar' }));
    await userEvent.tab();
    await userEvent.tab();
    expect((await screen.findAllByText('Mover o mapa: arraste o fundo')).length).toBeGreaterThan(0);
    expect(await violations(container)).toEqual([]);
  });
  it('ZoomControl: limites 60–140% e Ajustar', async () => {
    expect(stepZoom(0.6, -1)).toBe(0.6);
    expect(stepZoom(1.4, 1)).toBe(1.4);
    expect(stepZoom(1, 1)).toBe(1.1);
    const onFit = vi.fn();
    const props = { 'aria-label': 'Zoom', zoomOutLabel: 'Diminuir', zoomInLabel: 'Aumentar', fitText: 'Ajustar', onZoomIn: vi.fn(), onZoomOut: vi.fn(), onFit };
    const { container } = render(<ZoomControl {...props} percent="60%" canZoomOut={false} />);
    expect(screen.getByRole('button', { name: 'Diminuir' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Ajustar' }));
    expect(onFit).toHaveBeenCalledOnce();
    expect(await violations(container)).toEqual([]);
  });
});

describe('painel', () => {
  function Tabs() {
    const [v, setV] = useState('content');
    return (
      <>
        <InspectorTabs aria-label="Seções" idPrefix="t" value={v} onChange={setV} tabs={[{ id: 'content', label: 'Conteúdo' }, { id: 'rubric', label: 'Rubrica' }, { id: 'origin', label: 'Origem' }]} />
        <InspectorTabPanel idPrefix="t" id={v}>corpo {v}</InspectorTabPanel>
      </>
    );
  }
  it('InspectorTabs: tablist, roving tabindex, setas trocam e focam, tabpanel ligado', async () => {
    const { container } = render(<Tabs />);
    expect(screen.getByRole('tablist', { name: 'Seções' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Rubrica' })).toHaveAttribute('tabindex', '-1');
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Rubrica' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Rubrica' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Rubrica' })).toHaveTextContent('corpo rubric');
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Origem' })).toHaveFocus();
    expect(await violations(container)).toEqual([]);
  });
  it('RubricList: tags Essencial/Opcional', async () => {
    const { container } = render(<RubricList header={{ badge: 'Aprovada', meta: 'v1.2' }} essentialLabel="Essencial" optionalLabel="Opcional" items={[{ text: 'A', essential: true }, { text: 'B', essential: false }]} />);
    expect(screen.getAllByRole('listitem').map((l) => l.textContent)).toEqual(['EssencialA', 'OpcionalB']);
    expect(await violations(container)).toEqual([]);
  });
});

describe('desafio', () => {
  const q = {
    eyebrow: 'Desafio', progressText: '3 de 12', progress: 0.25, progressLabel: 'Progresso', question: 'Qual é o passo 5?', modeLabel: 'Como responder',
    modes: [{ value: 'write', label: 'Escrever' }, { value: 'options', label: 'Opções' }, { value: 'speak', label: 'Falar' }] as const,
    answerLabel: 'Sua resposta', answer: '', optionsLabel: 'Alternativas', options: [{ id: 'a', key: 'A', text: 'Noradrenalina' }], selectedOption: null,
    voice: { recordLabel: 'Gravar', note: 'Áudio descartado', onRecord: () => {} }, checkLabel: 'Corrigir resposta', chips: [{ label: 'Próximo passo', tone: 'brand' }] as const,
  };
  it('Escrever/Opções/Falar, progresso e botão desabilitado sem resposta', async () => {
    const onModeChange = vi.fn();
    const onCheck = vi.fn();
    const props = { ...q, onModeChange, onAnswerChange: vi.fn(), onSelectOption: vi.fn(), onCheck };
    const { container, rerender } = render(<QuestionPanel {...props} mode="write" canCheck={false} />);
    expect(screen.getByRole('progressbar', { name: 'Progresso' })).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByText('3 de 12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Corrigir resposta' })).toBeDisabled();
    expect(screen.getByLabelText('Sua resposta')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Opções' }));
    expect(onModeChange).toHaveBeenCalledWith('options');
    rerender(<QuestionPanel {...props} mode="options" canCheck />);
    await userEvent.click(screen.getByRole('button', { name: /Noradrenalina/ }));
    expect(props.onSelectOption).toHaveBeenCalledWith('a');
    await userEvent.click(screen.getByRole('button', { name: 'Corrigir resposta' }));
    expect(onCheck).toHaveBeenCalledOnce();
    rerender(<QuestionPanel {...props} mode="speak" canCheck />);
    expect(screen.getByRole('button', { name: 'Gravar' })).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
  it('com result o formulário some e a pergunta fica', () => {
    render(<QuestionPanel {...q} mode="write" canCheck onModeChange={vi.fn()} onAnswerChange={vi.fn()} onSelectOption={vi.fn()} onCheck={vi.fn()} result={<p>veredito</p>} />);
    expect(screen.getByText('veredito')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qual é o passo 5?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Corrigir resposta' })).toBeNull();
  });
  it('VerdictBox e notas', async () => {
    const onClick = vi.fn();
    const { container } = render(
      <>
        <VerdictBox verdict="partial" label="Parcial" headline="Acertou a droga" matched="Noradrenalina" missing="Alvo" note="Revisada por X" />
        <RatingGroup label="Como foi lembrar?"><RatingButton label="Bom" hint="volta em 4 dias" suggested onClick={onClick} shortcut="3" /></RatingGroup>
      </>,
    );
    expect(screen.getByRole('status')).toHaveAttribute('data-verdict', 'partial');
    await userEvent.click(screen.getByRole('button', { name: /Bom/ }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(await violations(container)).toEqual([]);
  });
});

describe('CommandPalette', () => {
  const items = [
    { id: 'c', group: 'Criar', label: 'Novo card de conceito', hint: 'Adiciona ao mapa' },
    { id: 'd', group: 'Mapa', label: 'Desafiar este mapa' },
    { id: 'm', group: 'Ir para', label: 'Meus mapas' },
  ];
  function Host({ onSelect }: { onSelect: (id: string) => void }) {
    const [open, setOpen] = useState(true);
    return <CommandPalette open={open} onOpenChange={setOpen} title="Buscar ou comandar" inputLabel="Buscar comando" placeholder="Buscar" escText="esc" emptyText="Nada encontrado" items={items} onSelect={(i) => onSelect(i.id)} />;
  }
  it('busca (sem acento/caixa), setas + Enter executam e fecham', async () => {
    const onSelect = vi.fn();
    render(<Host onSelect={onSelect} />);
    const input = screen.getByRole('combobox', { name: 'Buscar comando' });
    expect(input).toHaveFocus();
    expect(screen.getAllByRole('option')).toHaveLength(3);
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    await userEvent.type(input, 'DESAFIAR');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('d');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('sem resultado mostra o vazio; esc fecha; foco preso', async () => {
    render(<Host onSelect={vi.fn()} />);
    await userEvent.type(screen.getByRole('combobox'), 'zzz');
    expect(screen.getByText('Nada encontrado')).toBeInTheDocument();
    await userEvent.tab();
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('sem violações axe', async () => {
    render(<Host onSelect={vi.fn()} />);
    expect(await violations(screen.getByRole('dialog'))).toEqual([]);
  });
});

describe('Editor composto', () => {
  it('troca de camada muda o rodapé dos nós e a legenda some fora da Lembrança', async () => {
    const { container } = render(<EditorFixture />);
    expect(screen.getByRole('list', { name: 'Legenda' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Estrutura' }));
    expect(screen.getAllByText('3 conexões').length).toBeGreaterThan(0);
    expect(screen.queryByRole('list', { name: 'Legenda' })).toBeNull();
    expect(await violations(container)).toEqual([]);
  });
});
