import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AppRail, RailAccount, RailItem } from './app-rail';
import { Button } from './button';
import { IconButton } from './icon-button';
import { Icon } from './icons';
import { Input } from './input';
import { Logo } from './logo';
import { Hero } from './hero';
import { Constellation } from './constellation';
import { Ring } from './ring';
import { StateBar } from './state-bar';
import { GraphPreview } from './graph-preview';
import { MapTile } from './map-tile';
import { FilterChip } from './filter-chip';
import { ViewToggle } from './view-toggle';
import { Segmented } from './segmented';
import { Stepper } from './stepper';
import { ChoiceCard, ChoiceRow } from './choice-card';
import { Dropzone } from './dropzone';
import { ToastProvider, useToast } from './toast';
import { constellationEdges, constellationNodes, sepsePreview } from './fixtures-v2';

/**
 * Primitivos v2 (G01 T1). Regras de uso:
 * - Medidas, raios e cores são a especificação dos mocks (docs/design/v2). Não ajuste por gosto.
 * - Texto visível sempre por props (aqui, literais só nas histórias).
 * - Sobre painel escuro use Button variant light / outline-light; nunca primary.
 * - Ícones: <Icon name="..."/> (decorativo); o rótulo fica no botão que o contém.
 */
const meta = { title: 'Primitivos v2/Geral' } satisfies Meta;
export default meta;
type S = StoryObj<typeof meta>;

const counts = { review: 2, watch: 2, steady: 1, unknown: 1 };

export const Rail: S = {
  render: () => (
    <div className="h-[560px]">
      <AppRail aria-label="Principal" logo={<a href="#" aria-label="Remoa, ir para Hoje"><Logo size={36} /></a>} account={<RailAccount aria-label="Minha conta" />}>
        <RailItem icon="home" label="Hoje" href="#" active />
        <RailItem icon="maps" label="Mapas" href="#" />
        <RailItem icon="bolt" label="Revisar" href="#" badge={12} badgeLabel="12 revisões vencidas" />
        <RailItem icon="bars" label="Enamed" />
        <RailItem icon="store" label="Loja" />
      </AppRail>
    </div>
  ),
};

export const HeroWithConstellation: S = {
  render: () => (
    <div className="w-[888px]"><Hero
      eyebrow="Revisão de hoje"
      title="4 mapas, 12 conceitos para fixar hoje."
      description="A fila começa por Choque séptico, que vence hoje com lembrança estimada de 58%."
      actions={<><Button variant="light" size="hero" iconEnd={<Icon name="right" size={20} />}>Começar revisão</Button><Button variant="outline-light" size="hero">Só Sepse</Button></>}
      progress={{ value: 3, max: 15, title: '3 de 15', caption: 'revisados hoje' }}
    >
      <Constellation nodes={constellationNodes} edges={constellationEdges} />
    </Hero></div>
  ),
};

export const RingStates: S = { render: () => <div className="flex gap-4 rounded-list bg-panel-dark p-6"><Ring value={0} max={15} /><Ring value={3} max={15} /><Ring value={15} max={15} /><div className="bg-surface p-3"><Ring tone="primary" value={5} max={10} label="5 de 10" /></div></div> };

export const Tiles: S = {
  render: () => (
    <div className="grid w-[888px] grid-cols-3 gap-5">
      <MapTile href="#" aria-label="Abrir o mapa Sepse" area="Clínica Médica" title="Sepse" preview={sepsePreview} counts={counts} stateBarLabel="2 a revisitar, 2 a acompanhar, 1 mais estável, 1 sem revisões" meta="6 cards · 6 conexões" due={{ text: '2 vencem hoje', tone: 'review' }} />
      <MapTile size="md" href="#" aria-label="Abrir o mapa Abdome agudo" area="Cirurgia" title="Abdome agudo" preview={sepsePreview} counts={counts} stateBarLabel="Estados" meta="24 cards · 27 conexões" due={{ text: 'Em dia', tone: 'unknown' }} saved="Salvo há 4 dias" />
    </div>
  ),
};

export const PreviewAndBar: S = {
  render: () => (
    <div className="flex max-w-[300px] flex-col gap-4">
      <GraphPreview preview={sepsePreview} />
      <GraphPreview preview={{ nodes: [], edges: [] }} />
      <StateBar counts={counts} aria-label="Estados" />
    </div>
  ),
};

export const FiltersAndViews: S = {
  render: function Render() {
    const [area, setArea] = useState('Todos');
    const [view, setView] = useState('grid');
    const [mode, setMode] = useState('explore');
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Input variant="search" label="Buscar mapa" placeholder="Buscar mapa" />
          <ViewToggle aria-label="Visualização" value={view} onValueChange={setView} options={[{ value: 'grid', label: 'Ver em grade', icon: 'grid' }, { value: 'list', label: 'Ver em lista', icon: 'list' }]} />
          <Button iconEnd={undefined} icon={<Icon name="plus" size={20} />}>Novo mapa</Button>
        </div>
        <div role="group" aria-label="Filtrar por área" className="flex gap-2.5">
          {['Todos', 'Clínica Médica', 'Cirurgia'].map((a, i) => <FilterChip key={a} pressed={area === a} count={i + 2} onClick={() => setArea(a)}>{a}</FilterChip>)}
        </div>
        <Segmented aria-label="Modo" value={mode} onValueChange={setMode} options={[{ value: 'explore', label: 'Explorar' }, { value: 'challenge', label: 'Desafio' }]} />
      </div>
    );
  },
};

export const NewMapFlow: S = {
  render: function Render() {
    const [path, setPath] = useState('pdf');
    const [item, setItem] = useState(0);
    const [opt, setOpt] = useState(true);
    return (
      <div className="flex max-w-[660px] flex-col gap-6">
        <Stepper aria-label="Passos" steps={['Início', 'Detalhes', 'Material']} current={1} doneLabel="concluído" />
        <div className="grid grid-cols-2 gap-3.5" role="group" aria-label="Caminho">
          <ChoiceCard icon="file" tag="Rascunho por IA" title="De um PDF" description="Envie um material e revise o rascunho." selected={path === 'pdf'} onSelect={() => setPath('pdf')} />
          <ChoiceCard icon="archive" tag="Seus cards" title="Do Anki" description="Seu .apkg vira mapa." selected={path === 'anki'} onSelect={() => setPath('anki')} />
        </div>
        <div role="group" aria-label="Item da matriz" className="flex flex-col gap-2">
          {['Sepse e choque séptico', 'Insuficiência cardíaca'].map((l, i) => <ChoiceRow key={l} indicator="radio" selected={item === i} onSelect={() => setItem(i)}>{l}</ChoiceRow>)}
          <ChoiceRow indicator="check" selected={opt} onSelect={() => setOpt(!opt)}>Gerar fluxogramas</ChoiceRow>
          <ChoiceRow size="lg" indicator="radio" selected title="Sepse e choque séptico" description="42 cards · 2 fluxogramas" badge="Revisado" onSelect={() => undefined} />
        </div>
        <Dropzone title="Arraste o PDF aqui" description="ou escolha um arquivo de até 50 MB" buttonLabel="Escolher arquivo" accept=".pdf" onFiles={() => undefined} />
        <Dropzone title="" description="" buttonLabel="" onFiles={() => undefined} file={{ name: 'sepse.pdf', meta: '2,4 MB · 38 páginas' }} replaceLabel="Trocar" />
      </div>
    );
  },
};

export const ButtonsAndFields: S = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm">Pequeno 44</Button><Button>Médio 48</Button><Button size="lg">Grande 52</Button><Button variant="secondary">Importar</Button><Button disabled>Desabilitado</Button>
        <IconButton aria-label="Fechar" variant="secondary"><Icon name="close" size={20} /></IconButton>
      </div>
      <div className="max-w-[420px]"><Input label="Nome do mapa" defaultValue="Sepse" /></div>
    </div>
  ),
};

function ToastDemo() {
  const { toast } = useToast();
  return <Button onClick={() => toast({ title: 'Mapa salvo' })}>Disparar aviso</Button>;
}
export const Toasts: S = { render: () => <ToastProvider closeLabel="Fechar aviso" viewportLabel="Avisos"><ToastDemo /></ToastProvider> };
