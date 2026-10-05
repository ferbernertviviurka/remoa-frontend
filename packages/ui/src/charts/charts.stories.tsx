import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { RingProgress, SegmentBar, ColumnChart, Donut, LineChart, Heatmap, KpiCard, ToggleChip, SwitchRow } from './index';
import { forecast, retention, activity } from './fixtures';

/** Gráficos da tela Revisar (F21): SVG + CSS, sem biblioteca. Todo texto entra por props (a página passa `t(...)`). Movimento reduzido mostra o estado final. */
const meta = { title: 'Charts/Revisar' } satisfies Meta;
export default meta;
type S = StoryObj;

const states = [
  { id: 'due', label: 'Vencidos', value: 12, color: 'var(--state-review-border)' },
  { id: 'watch', label: 'Em atenção', value: 5, color: 'var(--state-watch-border)' },
  { id: 'steady', label: 'Firmes', value: 30, color: 'var(--primary)' },
  { id: 'new', label: 'Novos', value: 8, color: 'var(--state-unknown-border)' },
];

export const Ring: S = { render: () => <div className="bg-panel-dark p-8"><RingProgress value={3} max={15} label="3 de 15 revisados hoje"><b className="text-5xl">12</b><span>na fila</span></RingProgress></div> };
export const RingDone: S = { render: () => <div className="bg-panel-dark p-8"><RingProgress value={15} max={15} label="Tudo revisado hoje" /></div> };
export const Bar: S = { render: () => <div className="w-[600px]"><SegmentBar summary="12 vencidos, 5 novos, 3 em atenção" segments={[{ id: 'a', value: 12, color: 'var(--state-review-border)' }, { id: 'b', value: 5, color: 'var(--primary)' }, { id: 'c', value: 3, color: 'var(--state-watch-border)' }]} /></div> };
export const Forecast: S = { render: () => <div className="w-[640px]"><ColumnChart items={forecast} summary="Previsão de 14 dias, pico de 22 cards" valueLabel={(i) => `${i.value} cards`} tableHeaders={['Dia', 'Cards']} tableToggleLabel="Ver como tabela" /></div> };
export const ForecastEmpty: S = { render: () => <div className="w-[640px]"><ColumnChart items={forecast.map((i) => ({ ...i, value: 0 }))} summary="Nada previsto" valueLabel={(i) => `${i.value} cards`} tableHeaders={['Dia', 'Cards']} emptyText="Nada previsto para os próximos dias" /></div> };
export const StateDonut: S = { render: () => <div className="w-[560px]"><Donut segments={states} summary="55 cards: 12 vencidos, 5 em atenção, 30 firmes, 8 novos" totalLabel="cards" tableHeaders={['Estado', 'Cards']} tableToggleLabel="Ver como tabela" /></div> };
export const DonutEmpty: S = { render: () => <div className="w-[560px]"><Donut segments={states.map((s) => ({ ...s, value: 0 }))} summary="Sem cards" totalLabel="cards" emptyText="sem cards" tableHeaders={['Estado', 'Cards']} /></div> };
function RetentionDemo() {
    const [n, setN] = useState(30);
    return (
      <div className="w-[640px]">
        <button type="button" onClick={() => setN(n === 30 ? 7 : 30)}>alternar período</button>
        <LineChart animationKey={n} points={retention.slice(-n)} summary="Retenção média de 85% nos últimos dias" valueLabel={(p) => `${p.value}%`} tableHeaders={['Data', 'Retenção']} tableToggleLabel="Ver como tabela" yTicks={[0, 50, 90, 100]} formatTick={(v) => `${v}%`} target={{ value: 90, label: '90%' }} fromLabel={`há ${n} dias`} toLabel="hoje" />
      </div>
    );
}
export const Retention: S = { render: () => <RetentionDemo /> };
export const RetentionEmpty: S = { render: () => <div className="w-[640px]"><LineChart points={[]} summary="Sem histórico" valueLabel={() => ''} tableHeaders={['Data', 'Retenção']} fromLabel="há 30 dias" toLabel="hoje" emptyText="Ainda sem histórico" /></div> };
export const Activity: S = { render: () => <div className="w-[480px]"><Heatmap cells={activity} summary="Atividade das últimas 15 semanas" idleCaption="Passe o mouse ou foque um dia" lessLabel="menos" moreLabel="mais" tableHeaders={['Dia', 'Revisões']} tableToggleLabel="Ver como tabela" /></div> };
export const ActivityEmpty: S = { render: () => <div className="w-[480px]"><Heatmap cells={activity.map((c) => ({ ...c, level: 0, label: '0 revisões' }))} summary="Sem atividade" idleCaption="Nenhuma revisão ainda" lessLabel="menos" moreLabel="mais" tableHeaders={['Dia', 'Revisões']} /></div> };
export const Kpis: S = { render: () => <div className="grid w-[900px] grid-cols-3 gap-5"><KpiCard label="Sequência" value="12" unit="dias" sub="Recorde: 20 dias" iconTone="review" dots={['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((l, i) => ({ label: l, on: i < 5 }))} extraLabel="5 de 7 dias com revisão" /><KpiCard index={1} label="Retenção 30 dias" value="91" unit="%" bar={{ pct: 91, target: 90 }} extraLabel="91%, meta 90%" sub="+2 pontos" /><KpiCard index={2} label="Revisados em 7 dias" value="84" sub="Média de 12 por dia" /></div> };
function ControlsDemo() {
    const [chip, setChip] = useState(true);
    const [sw, setSw] = useState(true);
    return (
      <div className="flex w-[360px] flex-col gap-3">
        <div role="group" aria-label="O que entra na fila"><ToggleChip pressed={chip} onPressedChange={setChip} title="Vencidos" sub="para hoje" count={12} color="var(--state-review-border)" /></div>
        <div role="group" aria-label="Mapas na sessão"><SwitchRow checked={sw} onCheckedChange={setSw} title="Cardiologia: IC e arritmias" sub="Clínica Médica" chip="12 + 3" /></div>
      </div>
    );
}
export const Controls: S = { render: () => <ControlsDemo /> };
