import type { Meta, StoryObj } from '@storybook/react';
import { CardPeek, ConnectBanner, EdgeLabelField } from '.';

const meta = { title: 'Torph/Mapa no celular/Peek e conectar' } satisfies Meta;
export default meta;
type S = StoryObj<typeof meta>;

const Frame = ({ children }: { children: React.ReactNode }) => <div className="relative mx-auto h-[844px] w-[390px] overflow-hidden bg-canvas">{children}</div>;
const noop = () => {};

export const Peek: S = {
  render: () => (
    <Frame>
      <CardPeek ariaLabel="Card selecionado" typeLabel="Conceito" state="review" stateLabel="Revisar" title="Choque séptico" summary="Vasopressor para PAM ≥ 65 e lactato > 2 apesar de volume." recall={0.58} nextLabel="58% · vence hoje" closeLabel="Fechar" reviewLabel="Revisar este conceito" editLabel="Editar card" connectLabel="Conectar a outro card" onClose={noop} onReview={noop} onEdit={noop} onConnect={noop} />
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
