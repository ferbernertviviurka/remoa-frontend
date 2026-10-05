import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MapAside, NavRow, ProgressSummary, ToggleRow } from './index';

/**
 * Regra de uso (F23, D-662/D-663): o aside é do mapa no celular; o Progresso mora aqui, não no cabeçalho.
 * Ordem das linhas: navegação, camadas (ToggleRow), recursos pagos/futuros ("Em breve" desativa a linha), suporte.
 * Todo texto vem por props (do pacote strings no app).
 */
const meta = { title: 'Mapa no celular/MapAside', component: MapAside, parameters: { layout: 'fullscreen' } } satisfies Meta<typeof MapAside>;
export default meta;

const segments = [
  { state: 'review', count: 6, label: 'Revisitar' },
  { state: 'watch', count: 9, label: 'Acompanhar' },
  { state: 'steady', count: 14, label: 'Mais estável' },
  { state: 'unknown', count: 3, label: 'Sem revisões' },
] as const;

function Demo({ initialOpen = true }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [fav, setFav] = useState(false);
  const [heat, setHeat] = useState(true);
  const [labels, setLabels] = useState(true);
  return (
    <div className="h-[844px] w-[390px] bg-canvas">
      <button type="button" onClick={() => setOpen(true)} className="m-4 h-11 rounded-btn bg-panel-dark px-4 text-on-dark">Menu</button>
      <MapAside
        open={open}
        onOpenChange={setOpen}
        label="Menu do mapa"
        closeLabel="Fechar o menu"
        backLabel="Meus mapas"
        backHref="#"
        title="Sepse"
        subtitle="Clínica Médica · só você vê"
        ownerInitial="V"
        favorite={{ label: 'Favoritar mapa', pressed: fav, onToggle: setFav }}
        preview={{ node: <span className="block size-full bg-primary-tint" />, label: 'Ver o mapa inteiro', caption: 'Ver o mapa inteiro', onClick: () => setOpen(false) }}
        progress={<ProgressSummary title="Progresso" countLabel="32 cards" average={68} averageLabel="lembrança estimada" segments={[...segments]} coverage="Cobre 40% do item “Sepse e choque séptico” na matriz" reviewLabel="Revisar este mapa · 6 hoje" />}
        detailsTitle="Detalhes"
        details={[{ label: 'Dono', value: 'Você' }, { label: 'Criado em', value: '12 de setembro' }, { label: 'Última edição', value: 'há 2 minutos' }, { label: 'Área', value: 'Clínica Médica' }, { label: 'Cards e conexões', value: '32 cards · 41 conexões' }]}
      >
        <NavRow icon="list" label="Cards em lista" description="Veja tudo em ordem de prioridade" />
        <ToggleRow icon="eye" label="Mapa de calor da memória" description="Cores por lembrança estimada" checked={heat} onCheckedChange={setHeat} />
        <ToggleRow icon="link" label="Rótulos das conexões" description="Aparecem a partir de 80% de zoom" checked={labels} onCheckedChange={setLabels} />
        <NavRow icon="tidy" label="Ajustar à tela" />
        <NavRow icon="bars" label="Cobertura da matriz Enamed" description="Item: Sepse e choque séptico" />
        <NavRow icon="sparkle" label="Gerar cards com IA" description="Restam 20 hoje" />
        <NavRow icon="store" label="Vender na Loja" description="A loja ainda não está aberta" soon="Em breve" />
        <NavRow icon="help" label="Falar com o suporte" />
      </MapAside>
    </div>
  );
}

export const Aberto: StoryObj = { render: () => <Demo /> };
export const Fechado: StoryObj = { render: () => <Demo initialOpen={false} /> };
