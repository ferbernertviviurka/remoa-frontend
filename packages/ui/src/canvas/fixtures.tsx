/* Dados e composição de exemplo do Editor (docs/design/v2/source/Editor.dc.html) para stories e comparação visual.
   Textos aqui são de exemplo; no app vêm de @remoa/strings. Não exportado pelo pacote. */
import { useMemo, useState } from 'react';
import type { MapState } from '../state';
import { NodeCard, type NodeLayer, type NodeStep, type NodeType } from './node-card';
import { route, type Rect, type Side } from './route';
import { EdgeLabel } from './edge-label';
import { LayerSwitch } from './layer-switch';
import { Legend } from './legend';
import { CanvasToolbar } from './canvas-toolbar';
import { ZoomControl, stepZoom, ZOOM_MAX, ZOOM_MIN } from './zoom-control';
import { CanvasPanel } from './canvas-panel';
import { InspectorTabs, InspectorTabPanel } from './inspector-tabs';
import { RubricList } from './rubric-list';
import { QuestionPanel, type AnswerMode } from './question-panel';
import { VerdictBox } from './verdict-box';
import { RatingButton, RatingGroup } from './rating-button';

export type FxNode = Rect & { id: string; type: NodeType; label: string; title: string; text: string; st: MapState; r: number; due?: boolean };
export const fxNodes: FxNode[] = [
  { id: 'sepse', type: 'concept', label: 'Conceito', title: 'Sepse', text: 'Disfunção orgânica grave por resposta desregulada à infecção.', st: 'steady', r: 94, x: 64, y: 150, w: 232, h: 150 },
  { id: 'triagem', type: 'concept', label: 'Conceito', title: 'Triagem', text: 'SIRS, NEWS2 ou qSOFA: nenhum isolado afasta sepse.', st: 'watch', r: 71, x: 376, y: 120, w: 232, h: 150 },
  { id: 'caso12', type: 'case', label: 'Caso clínico', title: 'Caso 12', text: '', st: 'watch', r: 83, x: 672, y: 130, w: 248, h: 176 },
  { id: 'choque', type: 'concept', label: 'Conceito', title: 'Choque séptico', text: 'Vasopressor para PAM ≥ 65 e lactato > 2 apesar de volume.', st: 'review', r: 58, x: 64, y: 380, w: 232, h: 150, due: true },
  { id: 'pacote', type: 'flow', label: 'Fluxograma', title: 'Pacote da 1ª hora', text: '', st: 'review', r: 64, x: 368, y: 350, w: 248, h: 282, due: true },
  { id: 'rx', type: 'image', label: 'Imagem', title: 'Rx de tórax: foco', text: '', st: 'unknown', r: 0, x: 672, y: 380, w: 248, h: 206 },
];
export const fxEdges: [string, Side, string, Side, string][] = [
  ['sepse', 'r', 'triagem', 'l', 'suspeita'], ['triagem', 'r', 'caso12', 'l', 'treina'], ['sepse', 'b', 'choque', 't', 'evolui para'],
  ['triagem', 'b', 'pacote', 't', 'positiva'], ['pacote', 'l', 'choque', 'r', 'PAM < 65'], ['rx', 'l', 'pacote', 'r', 'foco'],
];
const stLabel: Record<MapState, string> = { review: 'Revisitar', watch: 'Acompanhar', steady: 'Mais estável', unknown: 'Sem revisões' };
export const fxStateLabels = stLabel;
const STEPS = ['Dosar lactato', 'Hemoculturas antes do ATB', 'ATB de amplo espectro', 'Cristaloide 30 mL/kg', 'Noradrenalina se PAM < 65'];
const chips = [{ label: 'Exames', active: true }, { label: 'Diagnóstico' }, { label: 'Conduta' }];

export function footerFor(n: FxNode, layer: NodeLayer): string {
  if (layer === 'recall') return n.st === 'unknown' ? 'Sem revisões ainda' : `${stLabel[n.st]} · ${n.r}%${n.due ? ' · vence hoje' : ''}`;
  if (layer === 'structure') {
    const c = fxEdges.filter((e) => e[0] === n.id || e[2] === n.id).length;
    return `${c} ${c === 1 ? 'conexão' : 'conexões'}`;
  }
  return 'Entra em Sepse e choque séptico';
}

const toolItems = [
  { id: 'select', icon: 'cursor', label: 'Selecionar' }, { id: 'move', icon: 'move', label: 'Mover o mapa' }, { separator: true },
  { id: 'card', icon: 'plus', label: 'Adicionar card de conceito' }, { id: 'flow', icon: 'flow', label: 'Adicionar fluxograma' },
  { id: 'image', icon: 'image', label: 'Adicionar imagem' }, { id: 'case', icon: 'case', label: 'Adicionar caso clínico' }, { separator: true },
  { id: 'link', icon: 'link', label: 'Ligar cards' }, { id: 'tidy', icon: 'tidy', label: 'Organizar o mapa' },
] as const;

const tabs = [{ id: 'content', label: 'Conteúdo' }, { id: 'rubric', label: 'Rubrica' }, { id: 'origin', label: 'Origem' }, { id: 'history', label: 'Histórico' }] as const;
const options = [{ id: 'a', key: 'A', text: 'Noradrenalina se PAM < 65' }, { id: 'b', key: 'B', text: 'Dosar lactato' }, { id: 'c', key: 'C', text: 'ATB de amplo espectro' }, { id: 'd', key: 'D', text: 'Hemoculturas antes do ATB' }];

/** Editor montado só com os componentes do canvas (sem React Flow): usado pelas stories e pela comparação com os PNGs. */
export function EditorFixture({ challenge = false, initialSelected = 'choque', layer: layer0 = 'recall' as NodeLayer, zoom: zoom0 = 1, checked: checked0 = false }) {
  const [layer, setLayer] = useState<NodeLayer>(layer0);
  const [sel, setSel] = useState<string | null>(challenge ? 'pacote' : initialSelected);
  const [zoom, setZoom] = useState(zoom0);
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('content');
  const [mode, setMode] = useState<AnswerMode>('write');
  const [answer, setAnswer] = useState('Iniciar noradrenalina');
  const [checked, setChecked] = useState(checked0);
  const [opt, setOpt] = useState<string | null>(null);
  const byId = useMemo(() => Object.fromEntries(fxNodes.map((n) => [n.id, n])), []);
  const target = 'pacote';
  const nb = fxEdges.flatMap((e) => (e[0] === target ? [e[2]] : e[2] === target ? [e[0]] : []));
  const flowSteps = useMemo<NodeStep[]>(
    () => STEPS.map((text, i) => (i === 4 ? (challenge && !checked ? { text: 'Passo oculto: responda no painel', tone: 'hidden' } : layer === 'recall' ? { text, tone: 'weak' } : { text }) : { text })),
    [challenge, checked, layer],
  );
  const s = sel ? byId[sel] : null;
  return (
    <div className="flex h-[900px] w-[1440px] overflow-hidden bg-canvas text-(--cv-ink)">
      <div className="relative min-w-0 grow overflow-hidden bg-[#fbfafe] [background-image:radial-gradient(var(--grid-dot,#DAD6EE)_1px,transparent_1px)] [background-size:24px_24px]">
        <div className="absolute left-0 top-0 h-[832px] w-[1264px] origin-top-left" style={{ transform: `scale(${zoom})` }}>
          <svg width="0" height="0" className="absolute" aria-hidden="true"><defs><marker id="ah" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#8E88B5" /></marker></defs></svg>
          {fxEdges.map(([a, as, b, bs, label]) => {
            const r = route(byId[a]!, as, byId[b]!, bs);
            return (
              <div key={`${a}${b}`} className={challenge ? 'opacity-35' : undefined}>
                <svg width="1" height="1" className="pointer-events-none absolute left-0 top-0 overflow-visible" aria-hidden="true">
                  <path d={r.d} fill="none" stroke="#8E88B5" strokeWidth="1.7" strokeLinecap="round" markerEnd="url(#ah)" />
                </svg>
                <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: r.lx, top: r.ly }}><EdgeLabel label={label} /></div>
              </div>
            );
          })}
          {fxNodes.map((n) => (
            <div key={n.id} className="absolute" style={{ left: n.x, top: n.y }}>
              <NodeCard
                type={n.type} typeLabel={n.label} title={n.title} selectLabel={`Selecionar ${n.title}`} onSelect={() => setSel(n.id)}
                layer={layer} state={n.st} footer={footerFor(n, layer)} due={n.due} selected={sel === n.id}
                challenge={challenge ? (n.id === target ? 'target' : nb.includes(n.id) ? 'neighbor' : 'dim') : undefined}
                summary={n.text} chips={chips} steps={flowSteps} image={{ src: null, alt: 'Imagem enviada por você' }}
              />
            </div>
          ))}
        </div>
        <div className="absolute left-5 top-5 z-10"><LayerSwitch label="Camadas" value={layer} onChange={setLayer} options={[{ value: 'structure', label: 'Estrutura' }, { value: 'recall', label: 'Lembrança' }, { value: 'coverage', label: 'Cobertura' }]} /></div>
        {layer === 'recall' && !challenge ? <div className="absolute left-[400px] top-[26px] z-10"><Legend labels={stLabel} aria-label="Legenda" /></div> : null}
        <div className="absolute bottom-6 left-[261px] z-10"><CanvasToolbar aria-label="Ferramentas do mapa" items={toolItems} onSelect={() => {}} /></div>
        <div className="absolute bottom-6 left-5 z-10">
          <ZoomControl aria-label="Zoom" percent={`${Math.round(zoom * 100)}%`} zoomOutLabel="Diminuir zoom" zoomInLabel="Aumentar zoom" fitText="Ajustar"
            canZoomOut={zoom > ZOOM_MIN} canZoomIn={zoom < ZOOM_MAX} onZoomOut={() => setZoom(stepZoom(zoom, -1))} onZoomIn={() => setZoom(stepZoom(zoom, 1))} onFit={() => setZoom(1)} />
        </div>
        <div className="absolute bottom-5 right-5 top-5 z-10">
          <CanvasPanel aria-label={challenge ? 'Desafio' : 'Painel do card'}>
            {challenge ? (
              <QuestionPanel
                eyebrow="Desafio" progressText="3 de 12" progress={0.25} progressLabel="Progresso do desafio"
                chips={[{ label: 'Próximo passo', tone: 'brand' }, { label: 'Passo em Revisitar', tone: 'review' }]}
                question="Após 30 mL/kg de cristaloide, a PAM segue em 58 mmHg. Qual é o passo 5 do pacote da 1ª hora?"
                modeLabel="Como responder" modes={[{ value: 'write', label: 'Escrever' }, { value: 'options', label: 'Opções' }, { value: 'speak', label: 'Falar' }]} mode={mode} onModeChange={setMode}
                answerLabel="Sua resposta" answer={answer} onAnswerChange={setAnswer} optionsLabel="Alternativas" options={options} selectedOption={opt} onSelectOption={setOpt}
                voice={{ recordLabel: 'Gravar resposta por voz', transcript: '“Iniciar noradrenalina”', note: 'Só a transcrição fica salva. O áudio é descartado.', onRecord: () => {} }}
                checkLabel={mode === 'options' ? 'Confirmar resposta' : 'Corrigir resposta'} canCheck={mode !== 'options' || opt !== null} onCheck={() => setChecked(true)}
                result={checked ? (
                  <>
                    <VerdictBox verdict="partial" label="Parcial" headline="Acertou a droga, faltou o alvo." matched="Noradrenalina como vasopressor" missing="Alvo: PAM ≥ 65 mmHg" note="Corrigido contra a rubrica do card, revisada por [Nome do revisor] · CRM [00000]. Fonte: Surviving Sepsis Campaign 2021." />
                    <RatingGroup label="Como foi lembrar? Sugestão: Difícil">
                      <RatingButton label="Não lembrei" hint="volta em 10 min" onClick={() => {}} /><RatingButton label="Difícil" hint="volta em 1 dia" suggested onClick={() => {}} />
                      <RatingButton label="Bom" hint="volta em 4 dias" onClick={() => {}} /><RatingButton label="Fácil" hint="volta em 12 dias" onClick={() => {}} />
                    </RatingGroup>
                  </>
                ) : undefined}
              />
            ) : s ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex flex-col gap-2.5 px-5 pb-3.5 pt-5">
                  <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">{s.label}</span>
                  <h2 className="m-0 font-display text-[27px] font-extrabold leading-[1.1] tracking-[-.025em]">{s.title}</h2>
                </div>
                <InspectorTabs aria-label="Seções do card" idPrefix="fx" tabs={tabs} value={tab} onChange={setTab} />
                <div className="min-h-0 grow overflow-auto px-5 py-[18px]">
                  <InspectorTabPanel idPrefix="fx" id={tab}>
                    {tab === 'rubric' ? <RubricList header={{ badge: 'Aprovada', meta: 'v1.2 · usada na correção por IA' }} essentialLabel="Essencial" optionalLabel="Opcional" items={[{ text: 'Vasopressor de escolha: noradrenalina', essential: true }, { text: 'Hipotensão refratária à reposição volêmica', essential: false }]} /> : <p className="m-0 text-[15px] leading-[1.55] text-(--cv-ink-2)">{s.text}</p>}
                  </InspectorTabPanel>
                </div>
              </div>
            ) : null}
          </CanvasPanel>
        </div>
      </div>
    </div>
  );
}
