import type { Meta, StoryObj } from '@storybook/react';
import { CardHandles, CardPeek, ConnectBanner, EdgeLabelField, MapCard } from '.';

const meta = { title: 'Torph/Mapa no celular/Peek e conectar' } satisfies Meta;
export default meta;
type S = StoryObj<typeof meta>;

const Frame = ({ children }: { children: React.ReactNode }) => <div className="relative mx-auto h-[844px] w-[390px] overflow-hidden bg-canvas">{children}</div>;
const noop = () => {};

export const Peek: S = {
  render: () => (
    <Frame>
      <CardPeek ariaLabel="Card selecionado" typeLabel="Conceito" state="review" stateLabel="Revisar" title="Choque séptico" summary="Vasopressor para PAM ≥ 65 e lactato > 2 apesar de volume." recall={0.58} nextLabel="58% · vence hoje" closeLabel="Fechar" reviewLabel="Revisar este conceito" editLabel="Editar card" editText="Editar" connectLabel="Conectar a outro card" connectText="Conectar" onClose={noop} onReview={noop} onEdit={noop} onConnect={noop} />
    </Frame>
  ),
};
export const Alcas: S = {
  render: () => (
    <Frame>
      <div className="absolute top-40 left-16">
        <MapCard type="concept" typeLabel="Conceito" title="Choque séptico" state="review" stateLabel="Revisitar" selected selectLabel="Choque séptico" />
        <CardHandles connectLabel="Conectar “Choque séptico” a outro card" resizeLabel="Redimensionar “Choque séptico”" onConnect={noop} onResize={noop} onResizeStep={noop} />
      </div>
      <div className="absolute top-96 left-48">
        <MapCard type="concept" typeLabel="Conceito" title="Lactato" state="watch" stateLabel="Acompanhar" target selectLabel="Lactato" />
      </div>
    </Frame>
  ),
};
export const Conectando: S = {
  render: () => (
    <Frame>
      <ConnectBanner text="Toque no card que se liga a “Choque séptico”" cancelLabel="Cancelar conexão" onCancel={noop} />
    </Frame>
  ),
};
export const Rotulo: S = {
  render: () => (
    <Frame>
      <EdgeLabelField ariaLabel="Rótulo da conexão" inputLabel="Rótulo (pergunta)" placeholder="Ex.: evolui para" saveLabel="Salvar" skipLabel="Pular" onSave={noop} onSkip={noop} />
    </Frame>
  ),
};
