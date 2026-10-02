import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CanvasPanel } from './canvas-panel';
import { InspectorTabs, InspectorTabPanel } from './inspector-tabs';
import { RubricList } from './rubric-list';
import { QuestionPanel, type AnswerMode } from './question-panel';
import { VerdictBox } from './verdict-box';
import { RatingButton, RatingGroup } from './rating-button';
import { CommandPalette } from './command-palette';

const meta = { title: 'Torph/Canvas v2/Painel e desafio' } satisfies Meta;
export default meta;
type S = StoryObj<typeof meta>;

export const Abas: S = {
  render: function Render() {
    const tabs = [{ id: 'content', label: 'Conteúdo' }, { id: 'rubric', label: 'Rubrica' }, { id: 'origin', label: 'Origem' }, { id: 'history', label: 'Histórico' }] as const;
    const [tab, setTab] = useState<(typeof tabs)[number]['id']>('rubric');
    return (
      <div className="h-[520px] p-6">
        <CanvasPanel aria-label="Painel do card">
          <InspectorTabs aria-label="Seções do card" idPrefix="s" tabs={tabs} value={tab} onChange={setTab} />
          <div className="p-5">
            <InspectorTabPanel idPrefix="s" id={tab}>
              {tab === 'rubric' ? (
                <RubricList header={{ badge: 'Aprovada', meta: 'v1.2 · usada na correção por IA' }} essentialLabel="Essencial" optionalLabel="Opcional"
                  items={[{ text: 'Vasopressor de escolha: noradrenalina', essential: true }, { text: 'Alvo: PAM ≥ 65 mmHg', essential: true }, { text: 'Hipotensão refratária à reposição volêmica', essential: false }]} />
              ) : (
                <p className="m-0">Aba {tab}</p>
              )}
            </InspectorTabPanel>
          </div>
        </CanvasPanel>
      </div>
    );
  },
};

/** Veredito e notas. `suggested` marca a nota sugerida pelo grader; a resposta canônica só chega após a correção. */
export const Veredito: S = {
  render: () => (
    <div className="flex max-w-[340px] flex-col gap-4 p-6">
      <VerdictBox verdict="correct" label="Correto" headline="Isso mesmo." matched="Noradrenalina se PAM < 65" note="Corrigido contra a rubrica do card." />
      <VerdictBox verdict="partial" label="Parcial" headline="Acertou a droga, faltou o alvo." matched="Noradrenalina como vasopressor" missing="Alvo: PAM ≥ 65 mmHg" />
      <VerdictBox verdict="incorrect" label="Incorreto" headline="Não é esse o passo." missing="Passo 5: noradrenalina se PAM < 65" />
      <RatingGroup label="Como foi lembrar? Sugestão: Bom">
        <RatingButton label="Não lembrei" hint="volta em 10 min" onClick={() => {}} /><RatingButton label="Difícil" hint="volta em 1 dia" onClick={() => {}} />
        <RatingButton label="Bom" hint="volta em 4 dias" suggested onClick={() => {}} /><RatingButton label="Fácil" hint="volta em 12 dias" onClick={() => {}} />
      </RatingGroup>
    </div>
  ),
};

export const Pergunta: S = {
  render: function Render() {
    const [mode, setMode] = useState<AnswerMode>('options');
    const [opt, setOpt] = useState<string | null>(null);
    const [answer, setAnswer] = useState('');
    return (
      <div className="h-[760px] p-6">
        <CanvasPanel aria-label="Desafio">
          <QuestionPanel eyebrow="Desafio" progressText="3 de 12" progress={0.25} progressLabel="Progresso do desafio"
            chips={[{ label: 'Próximo passo', tone: 'brand' }, { label: 'Passo em Revisitar', tone: 'review' }]}
            question="Após 30 mL/kg de cristaloide, a PAM segue em 58 mmHg. Qual é o passo 5 do pacote da 1ª hora?"
            modeLabel="Como responder" modes={[{ value: 'write', label: 'Escrever' }, { value: 'options', label: 'Opções' }, { value: 'speak', label: 'Falar' }]} mode={mode} onModeChange={setMode}
            answerLabel="Sua resposta" answer={answer} onAnswerChange={setAnswer} optionsLabel="Alternativas"
            options={[{ id: 'a', key: 'A', text: 'Noradrenalina se PAM < 65' }, { id: 'b', key: 'B', text: 'Dosar lactato' }]} selectedOption={opt} onSelectOption={setOpt}
            voice={{ recordLabel: 'Gravar resposta por voz', note: 'Só a transcrição fica salva. O áudio é descartado.', onRecord: () => {} }}
            checkLabel="Corrigir resposta" canCheck={mode === 'options' ? opt !== null : mode === 'write' ? answer.trim() !== '' : true} onCheck={() => {}} />
        </CanvasPanel>
      </div>
    );
  },
};

/** ⌘K: o atalho é registrado por quem monta. Foco preso, Esc fecha, ↑/↓ + Enter. */
export const Paleta: S = {
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <div className="p-6">
        <button type="button" onClick={() => setOpen(true)}>Abrir</button>
        <CommandPalette open={open} onOpenChange={setOpen} title="Buscar ou comandar" inputLabel="Buscar comando" placeholder="Buscar card, comando ou mapa" escText="esc" emptyText="Nada encontrado para essa busca."
          onSelect={() => {}}
          items={[
            { id: 'c', group: 'Criar', label: 'Novo card de conceito', hint: 'Adiciona ao mapa' }, { id: 'f', group: 'Criar', label: 'Novo fluxograma de conduta', hint: 'Passos ordenados' },
            { id: 'l', group: 'Mapa', label: 'Ligar dois cards', hint: 'Ferramenta de conexão' }, { id: 'd', group: 'Mapa', label: 'Desafiar este mapa', hint: 'Começa pelos vencidos' },
            { id: 'h', group: 'Ir para', label: 'Meus mapas', hint: 'Biblioteca' },
          ]} />
      </div>
    );
  },
};
