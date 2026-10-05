import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from '../avatar';
import { Button } from '../button';
import { Icon } from '../icons';
import {
  AvatarCropper, ChoiceChip, ChoiceChipMulti, CompletenessRing, DangerCard, InlineField, NumberStepper, PasswordMeter, SettingsNav, SettingsNavAction, UsageMeter, UsageWarning,
  type AvatarCropperHandle,
} from './index';

/** Conta (F13). Rótulos chegam por props; aqui são textos de exemplo. Movimento: `data-motion="reduced"` na raiz desliga tudo. */
const meta = { title: 'Conta/Componentes' } satisfies Meta;
export default meta;
type S = StoryObj<typeof meta>;

export const Avatares: S = {
  render: () => (
    <div className="flex items-center gap-3">
      {[0, 1, 2, 3, 4].map((c) => <Avatar key={c} name="Ana Lima" fallback="AL" size={c === 4 ? 108 : 48} color={c} plain />)}
    </div>
  ),
};

export const AnelDeCompletude: S = {
  render: () => (
    <div className="inline-block rounded-hero bg-panel-dark p-8">
      <CompletenessRing value={60} label="Perfil 60% completo"><Avatar name="Ana Lima" fallback="AL" size={108} plain color={0} /></CompletenessRing>
    </div>
  ),
};

function StepperDemo() {
    const [v, setV] = useState(5);
    const [msg, setMsg] = useState('');
    return (
      <div className="flex flex-col gap-2">
        <NumberStepper label="Cards novos por dia" value={v} min={5} max={10} step={5} onChange={setV} onLimit={() => setMsg('O Pro libera até 20 por dia.')} decLabel="Menos cards" incLabel="Mais cards" unit="por dia" />
        <p role="status" className="text-sm text-watch-text">{msg}</p>
      </div>
    );
  }

export const Passos: S = { render: () => <StepperDemo /> };

export const MedidorDeSenha: S = {
  render: () => (
    <PasswordMeter score={2} label="Razoável" doneLabel="cumprido" todoLabel="pendente" checks={[{ id: 'a', label: '8 ou mais caracteres', ok: true }, { id: 'b', label: 'Letras e números', ok: false }, { id: 'c', label: '12 ou mais caracteres deixa a senha mais forte', ok: false }]} />
  ),
};

export const CampoEmLinha: S = {
  render: () => (
    <div className="max-w-3xl">
      <InlineField label="Nome" value="Ana Lima" editLabel="Editar" editAriaLabel="Editar nome">
        {({ close }) => (
          <>
            <label htmlFor="n" className="font-bold">Nome</label>
            <input id="n" defaultValue="Ana Lima" className="h-[52px] rounded-field border-[1.5px] border-border-strong px-4" />
            <span className="flex gap-2.5"><Button onClick={close}>Salvar nome</Button><Button variant="secondary" onClick={close}>Cancelar</Button></span>
          </>
        )}
      </InlineField>
    </div>
  ),
};

function ChipsDemo() {
    const [v, setV] = useState<string | null>('2027.1');
    return <ChoiceChip label="Objetivo de prova" value={v} onValueChange={setV} options={[{ value: '2027.1', label: 'Enamed 2027.1' }, { value: '2027.2', label: 'Enamed 2027.2' }, { value: 'x', label: 'Ainda não sei' }]} />;
  }

export const ChipsDeEscolha: S = { render: () => <ChipsDemo /> };

export const Uso: S = {
  render: () => (
    <div className="max-w-xl">
      <UsageMeter label="Correções por IA" sub="Hoje" value="0 de 20" percent={0} />
      <UsageMeter label="Cards" sub="Total na conta" value="168 de 200" percent={84} tone="warn" warning={<UsageWarning action={<button type="button" className="h-11 font-bold text-primary-deep underline">Ver o Pro</button>}>Perto do limite. O Pro remove esse teto.</UsageWarning>} />
      <UsageMeter label="Mapas gerados" value="3 de 3" percent={100} tone="danger" />
      <UsageMeter label="Mapas" value="Ilimitados" percent={100} tone="unlimited" />
    </div>
  ),
};

export const NavegacaoDaConta: S = {
  render: () => (
    <SettingsNav
      label="Seções da conta"
      items={[
        { id: 'perfil', href: '#perfil', label: 'Perfil', icon: <Icon name="user" size={20} />, current: true },
        { id: 'plano', href: '#plano', label: 'Plano e uso', icon: <Icon name="bolt" size={20} />, chip: 'Free' },
      ]}
      footer={<SettingsNavAction icon={<Icon name="left" size={20} />} onClick={() => undefined}>Sair da conta</SettingsNavAction>}
    />
  ),
};

export const ZonaDePerigo: S = {
  render: () => <DangerCard title="Excluir conta" description="Agenda a exclusão para 7 dias. Você pode cancelar nesse prazo."><Button variant="danger">Excluir minha conta</Button></DangerCard>,
};

/** Regra de uso: `src` deve ser um object URL de arquivo já validado com `validateAvatarFile`. "Salvar" chama `ref.exportBlob()`. */
function CropperDemo() {
    const ref = useRef<AvatarCropperHandle>(null);
    const [out, setOut] = useState('');
    const src = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#16324f"/><circle cx="200" cy="120" r="50" fill="#f0b78c"/><ellipse cx="200" cy="280" rx="120" ry="100" fill="#6d5bd0"/></svg>');
    return (
      <div className="flex flex-col items-center gap-3">
        <AvatarCropper ref={ref} src={src} areaLabel="Área da foto: arraste ou use as setas" zoomLabel="Zoom da foto" />
        <Button onClick={async () => setOut(String((await ref.current?.exportBlob())?.size ?? 'sem imagem'))}>Salvar foto</Button>
        <p role="status" className="text-sm text-muted">{out}</p>
      </div>
    );
  }

export const Recorte: S = { render: () => <CropperDemo /> };

function MultiDemo() {
  const [v, setV] = useState<string[]>(['2027.1']);
  return <ChoiceChipMulti label="Objetivos de prova" values={v} onValuesChange={setV} full={v.length >= 3} options={[{ value: '2027.1', label: 'Enamed 2027.1' }, { value: '2027.2', label: 'Enamed 2027.2' }, { value: 'x', label: 'Ainda não sei' }, { value: 'y', label: 'USP' }]} />;
}

export const ChipsMultiplos: S = { render: () => <MultiDemo /> };
