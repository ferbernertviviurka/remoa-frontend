import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

function Arrow({ flip = false }: { flip?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={flip ? 'rotate-180' : undefined}>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LoadingDemo() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      icon={<Arrow />}
      iconEnd={<Arrow flip />}
      loading={loading}
      loadingLabel="Salvando"
      onClick={() => {
        setLoading(true);
        window.setTimeout(() => setLoading(false), 1400);
      }}
    >
      Salvar
    </Button>
  );
}

const meta = { title: 'Button', component: Button } satisfies Meta<typeof Button>;
export default meta;
type S = StoryObj<typeof meta>;
export const Primary: S = { args: { children: 'Revisar hoje' } };
export const Secondary: S = { args: { variant: 'secondary', children: 'Cancelar' } };
export const Quiet: S = { args: { variant: 'quiet', children: 'Ver mais' } };
export const Danger: S = { args: { variant: 'danger', children: 'Excluir' } };
export const Touch: S = { args: { size: 'touch', children: 'Responder' } };
export const IconStart: S = { args: { icon: <Arrow />, children: 'Continuar' } };
export const IconEnd: S = { args: { iconEnd: <Arrow />, children: 'Próximo' } };
export const Icons: S = { args: { icon: <Arrow flip />, iconEnd: <Arrow />, children: 'Entre mapas' } };
export const Loading: S = { render: () => <LoadingDemo /> };
export const Variants: S = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button icon={<Arrow />}>Revisar hoje</Button>
      <Button variant="secondary" iconEnd={<Arrow />}>Cancelar</Button>
      <Button variant="quiet" icon={<Arrow flip />} iconEnd={<Arrow />}>Ver mais</Button>
      <Button variant="danger" icon={<Arrow />}>Excluir</Button>
      <Button size="touch" iconEnd={<Arrow />}>Responder</Button>
    </div>
  ),
};
