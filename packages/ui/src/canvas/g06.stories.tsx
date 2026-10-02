import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { NodeCard, StepTimeline, CaseStageList, type CaseStage, type NodeStep } from './node-card';
import { CanvasPanel } from './canvas-panel';
import { QuestionPanel } from './question-panel';

const meta = { title: 'Torph/Canvas v2/G06' } satisfies Meta;
export default meta;
type S = StoryObj<typeof meta>;

const base = { selectLabel: 'Selecionar', layer: 'recall', state: 'watch', footer: 'Acompanhar · 83%' } as const;
const img = { src: null, alt: 'Imagem de exemplo' };
const stages: CaseStage[] = [
  { key: 'apresentacao', label: 'Apresentação', text: 'Homem, 68 anos, febre e hipotensão há 12 h.', hint: 'Queixa e dados iniciais. Preencher cria o ponto de partida do raciocínio.' },
  { key: 'exames', label: 'Exames', text: 'Lactato 4,2; leucocitose com desvio.', hint: 'Achados laboratoriais e de imagem. Preencher libera o diagnóstico.' },
  { key: 'diagnostico', label: 'Diagnóstico', hint: 'Hipótese final. Preencher habilita o modo Caso no desafio.' },
  { key: 'conduta', label: 'Conduta', hint: 'O que fazer a seguir. Preencher completa a trilha.' },
];
const steps: NodeStep[] = [
  { text: 'Dosar lactato' }, { text: 'Hemoculturas antes do ATB', image: img }, { text: 'ATB de amplo espectro', tone: 'weak' }, { text: 'Cristaloide 30 mL/kg', tone: 'hidden' }, { text: 'Noradrenalina se PAM < 65' },
];

/** Tamanho livre (`size`): título/resumo cortam por linhas, imagem escala, rodapé sempre visível. */
export const TamanhosVariados: S = {
  render: () => (
    <div className="flex flex-wrap items-start gap-6 p-6">
      {[{ w: 140, h: 90 }, { w: 200, h: 120 }, { w: 232, h: 150 }, { w: 320, h: 220 }, { w: 420, h: 300 }].map((size) => (
        <NodeCard key={size.w} {...base} type="concept" typeLabel="Pergunta e Resposta" title="Choque séptico: manejo inicial" summary="Reposição volêmica, hemoculturas, antibiótico em 1 h e vasopressor se PAM < 65 após volume." size={size} />
      ))}
      <NodeCard {...base} type="concept" typeLabel="Pergunta e Resposta" title="Com imagem" summary="Qual o ritmo?" frontImage={img} size={{ w: 260, h: 280 }} />
    </div>
  ),
};

/** Conteúdo (`note`): só informativo; sem rodapé, sem botão de virar, sempre camada Estrutura. */
export const Conteudo: S = {
  render: () => (
    <div className="flex flex-wrap items-start gap-6 p-6">
      <NodeCard {...base} type="note" typeLabel="Conteúdo" title="Critérios qSOFA" summary="FR ≥ 22, alteração do estado mental e PAS ≤ 100. Dois ou mais sugerem maior risco." />
      <NodeCard {...base} type="note" typeLabel="Conteúdo" title="Com imagem" image={img} size={{ w: 300, h: 240 }} />
    </div>
  ),
};

/** Fluxograma como timeline: trilho, marcador numerado e conector; passo fraco/oculto mantém o aviso; imagem por passo. */
export const Timeline: S = {
  render: () => (
    <div className="flex flex-wrap items-start gap-6 p-6">
      <NodeCard {...base} type="flow" typeLabel="Fluxograma" title="Pacote da 1ª hora" steps={steps} />
      <div className="w-[300px] rounded-[20px] border border-border bg-surface p-4"><StepTimeline steps={steps} /></div>
    </div>
  ),
};

/** Caso clínico: cada etapa tem Tooltip (foco ou hover) com o que é e o que muda ao preencher. Card grande mostra o resumo; o texto completo vai no verso/painel (`CaseStageList`). */
export const CasoComTooltips: S = {
  render: () => (
    <div className="flex flex-wrap items-start gap-6 p-6">
      <NodeCard {...base} type="case" typeLabel="Caso clínico" title="Caso 12" caseStages={stages} />
      <NodeCard {...base} type="case" typeLabel="Caso clínico" title="Caso 12 (grande)" caseStages={stages} size={{ w: 320, h: 300 }} />
      <div className="w-[300px] rounded-[20px] border border-border bg-surface p-4"><CaseStageList stages={stages} /></div>
    </div>
  ),
};

/** Verso com imagem da resposta. */
export const VersoComImagem: S = {
  render: () => (
    <div className="p-8">
      <NodeCard {...base} type="concept" typeLabel="Pergunta e Resposta" title="ECG" summary="Qual o ritmo?" flipped back="Fibrilação atrial." backImage={img} flipLabel="Ver resposta" unflipLabel="Ver pergunta" size={{ w: 260, h: 260 }} />
    </div>
  ),
};

/** Painel animado: slide + fade de 220 ms; no celular sobe de baixo; sem animação com prefers-reduced-motion. */
function PanelDemo() {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex h-[360px] flex-col gap-3 p-6">
      <button type="button" aria-pressed={open} onClick={() => setOpen((o) => !o)} className="h-11 self-start rounded-pill border border-border px-4 font-bold">{open ? 'Fechar painel' : 'Abrir painel'}</button>
      <CanvasPanel aria-label="Painel do mapa" open={open}><p className="m-0 p-5">Conteúdo do painel</p></CanvasPanel>
    </div>
  );
}
export const PainelAnimado: S = { render: () => <PanelDemo /> };

/** Voz (D-203): botão desabilitado com Tag "Em breve", sem transcrição. */
export const VozEmBreve: S = {
  render: () => (
    <div className="h-[560px] w-[340px]">
      <CanvasPanel aria-label="Desafio">
        <QuestionPanel
          eyebrow="Desafio" progressText="3 de 12" progress={0.25} progressLabel="Progresso" question="Qual o vasopressor de primeira linha no choque séptico?"
          modeLabel="Como responder" modes={[{ value: 'write', label: 'Escrever' }, { value: 'speak', label: 'Falar' }]} mode="speak" onModeChange={() => {}}
          answerLabel="Sua resposta" answer="" onAnswerChange={() => {}} optionsLabel="Alternativas" options={[]} selectedOption={null} onSelectOption={() => {}}
          voice={{ recordLabel: 'Gravar resposta por voz', soonLabel: 'Em breve', note: 'A resposta por voz chega em uma próxima versão.' }}
          checkLabel="Corrigir resposta" canCheck={false} onCheck={() => {}}
        />
      </CanvasPanel>
    </div>
  ),
};
