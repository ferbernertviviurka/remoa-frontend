import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Combobox } from './combobox';

const OPTS = [
  { value: 'sepse', label: 'Sepse e choque séptico', group: 'Infectologia' },
  { value: 'pneu', label: 'Pneumonia adquirida na comunidade', group: 'Infectologia' },
  { value: 'iam', label: 'Infarto agudo do miocárdio', group: 'Cardiologia' },
  { value: 'has', label: 'Hipertensão arterial sistêmica', group: 'Cardiologia' },
  { value: 'tep', label: 'Tromboembolismo pulmonar', description: 'TEP e TVP', group: 'Pneumologia' },
  { value: 'dpoc', label: 'DPOC e exacerbações', group: 'Pneumologia' },
];

const SUGGESTED = OPTS.slice(0, 2);

const meta = { title: 'Combobox' } satisfies Meta;
export default meta;
type S = StoryObj<typeof meta>;

function ControlledCombobox(props: Omit<React.ComponentProps<typeof Combobox>, 'value' | 'onValueChange'>) {
  const [val, setVal] = useState<string[]>([]);
  return <Combobox {...props} value={val} onValueChange={setVal} />;
}

function PreselectedCombobox() {
  const [val, setVal] = useState(['sepse', 'iam']);
  return (
    <div className="max-w-md p-6">
      <Combobox
        label="Itens da matriz"
        placeholder="Buscar por tema ou código"
        options={OPTS}
        value={val}
        onValueChange={setVal}
        emptyLabel="Nenhum resultado"
        removeChipAriaLabel={(l) => `Remover ${l}`}
      />
    </div>
  );
}

function AtMaxCombobox() {
  const [val, setVal] = useState(['sepse', 'pneu', 'iam']);
  return (
    <div className="max-w-md p-6">
      <Combobox
        label="Itens da matriz (máx 3)"
        placeholder="Buscar"
        options={OPTS}
        value={val}
        onValueChange={setVal}
        max={3}
        maxMessage="Você pode ligar até 3 itens"
        removeChipAriaLabel={(l) => `Remover ${l}`}
        emptyLabel="Nenhum resultado"
      />
    </div>
  );
}

export const Default: S = {
  render: () => (
    <div className="max-w-md p-6">
      <ControlledCombobox
        label="Itens da matriz"
        placeholder="Buscar por tema ou código"
        options={OPTS}
        suggestions={SUGGESTED}
        suggestionsLabel="Sugeridos"
        emptyLabel="Nenhum resultado encontrado"
        max={10}
        maxMessage="Você pode ligar até 10 itens"
        removeChipAriaLabel={(l) => `Remover ${l}`}
      />
    </div>
  ),
};

export const WithPreselected: S = { render: () => <PreselectedCombobox /> };

export const Disabled: S = {
  render: () => (
    <div className="max-w-md p-6">
      <Combobox
        label="Itens da matriz"
        placeholder="Buscar"
        options={[]}
        value={[]}
        onValueChange={() => undefined}
        disabledMessage="A matriz Enamed desta área ainda não está disponível."
      />
    </div>
  ),
};

export const AtMax: S = { render: () => <AtMaxCombobox /> };
