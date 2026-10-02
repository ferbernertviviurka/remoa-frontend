import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { violations } from '../test-utils';
import { NodeCard, nodeSize, StepTimeline, type CaseStage } from './node-card';
import { CanvasPanel } from './canvas-panel';
import { QuestionPanel } from './question-panel';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };

const node = { type: 'concept', typeLabel: 'Conceito', title: 'Sepse', selectLabel: 'Selecionar Sepse', layer: 'recall', state: 'review', footer: 'Revisitar · 58%' } as const;
const stages: CaseStage[] = [
  { key: 'a', label: 'Apresentação', text: 'Febre e hipotensão', hint: 'Dados iniciais do caso.' },
  { key: 'e', label: 'Exames', hint: 'Achados de exames.' },
];

describe('NodeCard G06', () => {
  it('size sobrepõe nodeSize e o rodapé continua visível', () => {
    expect(nodeSize('concept', 'rect', { size: { w: 300, h: 111 } })).toEqual({ w: 300, h: 111 });
    const { container } = render(<NodeCard {...node} summary="Resumo" size={{ w: 300, h: 111 }} />);
    const a = screen.getByRole('article');
    expect(a).toHaveStyle({ width: '300px', height: '111px' });
    expect(screen.getByText('Revisitar · 58%')).toBeVisible();
    return violations(container).then((v) => expect(v).toEqual([]));
  });
  it('altura define as linhas do resumo', () => {
    const { rerender } = render(<NodeCard {...node} summary="Resumo" size={{ w: 232, h: 90 }} />);
    expect(screen.queryByText('Resumo')).toBeNull();
    rerender(<NodeCard {...node} summary="Resumo" size={{ w: 232, h: 300 }} />);
    expect(screen.getByText('Resumo').className).toMatch(/line-clamp-/);
  });
  it('note: sem rodapé, sem virar, camada Estrutura', async () => {
    const { container } = render(<NodeCard {...node} type="note" typeLabel="Conteúdo" layer="recall" summary="Texto" back="x" flipLabel="Ver" unflipLabel="Voltar" />);
    expect(screen.getByRole('article')).toHaveAttribute('data-layer', 'structure');
    expect(screen.queryByText('Revisitar · 58%')).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByText('Conteúdo')).toBeVisible();
    expect(await violations(container)).toEqual([]);
  });
  it('timeline: passos numerados, imagem e tom mantido', async () => {
    const { container } = render(<StepTimeline steps={[{ text: 'A', image: { src: null, alt: 'Foto A' } }, { text: 'B', tone: 'hidden' }]} />);
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Foto A' })).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
  it('caso: etapas com Tooltip por foco e resumo só fora do desafio', async () => {
    const { container, rerender } = render(<NodeCard {...node} type="case" caseStages={stages} size={{ w: 320, h: 300 }} />);
    expect(screen.getByText('Febre e hipotensão')).toBeInTheDocument();
    const exames = screen.getByRole('button', { name: 'Exames' });
    expect(exames).toHaveAttribute('data-filled', 'false');
    expect(screen.getByRole('button', { name: 'Apresentação' })).toHaveAttribute('data-filled', 'true');
    await userEvent.tab(); // select
    await userEvent.tab(); // Apresentação
    await userEvent.tab(); // Exames
    expect(exames).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Achados de exames.');
    expect(await violations(container)).toEqual([]);
    rerender(<NodeCard {...node} type="case" caseStages={stages} size={{ w: 320, h: 300 }} challenge="target" />);
    expect(screen.queryByText('Febre e hipotensão')).toBeNull();
  });
  it('caso: tooltip abre no hover', async () => {
    render(<NodeCard {...node} type="case" caseStages={stages} />);
    await userEvent.hover(screen.getByRole('button', { name: 'Apresentação' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Dados iniciais do caso.');
  });
  it('verso com backImage só monta virado', () => {
    const p = { ...node, back: 'Resp', backImage: { src: null, alt: 'Img resp' }, flipLabel: 'Ver resposta', unflipLabel: 'Ver pergunta' } as const;
    const { rerender } = render(<NodeCard {...p} />);
    expect(screen.queryByRole('img', { name: 'Img resp', hidden: true })).toBeNull();
    rerender(<NodeCard {...p} flipped />);
    expect(screen.getByRole('img', { name: 'Img resp', hidden: true })).toBeInTheDocument();
  });
});

describe('CanvasPanel animado', () => {
  const mm = (reduced: boolean) => { window.matchMedia = ((q: string) => ({ matches: reduced, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia; };
  afterEach(() => mm(false));
  it('data-state open/closed e onExited após a saída', async () => {
    const onExited = vi.fn();
    const { rerender, container } = render(<CanvasPanel aria-label="Painel" open onExited={onExited}>x</CanvasPanel>);
    expect(screen.getByLabelText('Painel')).toHaveAttribute('data-state', 'open');
    expect(await violations(container)).toEqual([]);
    rerender(<CanvasPanel aria-label="Painel" open={false} onExited={onExited}>x</CanvasPanel>);
    expect(screen.getByLabelText('Painel')).toHaveAttribute('data-state', 'closed');
    await waitFor(() => expect(screen.queryByLabelText('Painel')).toBeNull());
    expect(onExited).toHaveBeenCalledTimes(1);
  });
  it('reduced-motion: desmonta na hora', () => {
    mm(true);
    const { rerender } = render(<CanvasPanel aria-label="Painel" open>x</CanvasPanel>);
    rerender(<CanvasPanel aria-label="Painel" open={false}>x</CanvasPanel>);
    expect(screen.queryByLabelText('Painel')).toBeNull();
  });
  it('css: 220 ms, só transform/opacity, sem animação em reduced-motion, sheet no celular', () => {
    const css = readFileSync('src/canvas/canvas.css', 'utf8');
    expect(css).toContain('cv-panel-in 220ms');
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.cv-panel\[data-state\] \{ animation: none/);
    expect(css).toContain('translateY(100%)');
  });
});

describe('QuestionPanel voz Em breve', () => {
  it('botão aria-disabled, Tag, sem transcrição e sem onRecord', async () => {
    const onRecord = vi.fn();
    const { container } = render(
      <QuestionPanel eyebrow="Desafio" progressText="1 de 2" progress={0.5} progressLabel="P" question="Q?" modeLabel="Modo" modes={[{ value: 'speak', label: 'Falar' }]} mode="speak" onModeChange={vi.fn()}
        answerLabel="R" answer="" onAnswerChange={vi.fn()} optionsLabel="O" options={[]} selectedOption={null} onSelectOption={vi.fn()}
        voice={{ recordLabel: 'Gravar', soonLabel: 'Em breve', transcript: 'NAO', note: 'Nota', onRecord }} checkLabel="Corrigir" canCheck={false} onCheck={vi.fn()} />,
    );
    const rec = screen.getByRole('button', { name: 'Gravar' });
    expect(rec).toHaveAttribute('aria-disabled', 'true');
    expect(rec).toHaveAccessibleDescription(/Em breve/);
    await userEvent.click(rec);
    expect(onRecord).not.toHaveBeenCalled();
    expect(screen.queryByText('NAO')).toBeNull();
    expect(await violations(container)).toEqual([]);
  });
});
