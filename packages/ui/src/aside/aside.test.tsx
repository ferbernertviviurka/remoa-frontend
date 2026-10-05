import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MapAside, NavRow, ProgressSummary, ToggleRow } from './index';
import { violations } from '../test-utils';

const segs = [
  { state: 'review', count: 6, label: 'Revisitar' },
  { state: 'watch', count: 9, label: 'Acompanhar' },
  { state: 'steady', count: 14, label: 'Mais estável' },
  { state: 'unknown', count: 3, label: 'Sem revisões' },
] as const;

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(true);
  const [heat, setHeat] = useState(false);
  const [fav, setFav] = useState(false);
  return (
    <MapAside
      open={open}
      onOpenChange={(o) => { setOpen(o); if (!o) onClose?.(); }}
      label="Menu do mapa" closeLabel="Fechar o menu" backLabel="Meus mapas" backHref="#"
      title="Sepse" subtitle="Clínica Médica · só você vê" ownerInitial="V"
      favorite={{ label: 'Favoritar mapa', pressed: fav, onToggle: setFav }}
      progress={<ProgressSummary title="Progresso" average={68} averageLabel="lembrança estimada" segments={[...segs]} coverage="Cobre 40%" reviewLabel="Revisar este mapa · 6 hoje" />}
      detailsTitle="Detalhes" details={[{ label: 'Dono', value: 'Você' }]}
    >
      <ToggleRow icon="eye" label="Mapa de calor" checked={heat} onCheckedChange={setHeat} />
      <NavRow icon="store" label="Vender na Loja" soon="Em breve" />
      <NavRow icon="tidy" label="Ajustar à tela" />
    </MapAside>
  );
}

// jsdom não tem PointerEvent: sem isso clientX some.
if (typeof PointerEvent === 'undefined') (globalThis as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = MouseEvent;

describe('MapAside', () => {
  it('sem violações axe e com role dialog', async () => {
    render(<Harness />);
    expect(screen.getByRole('dialog', { name: 'Menu do mapa' })).toBeInTheDocument();
    expect(await violations(document.body)).toEqual([]);
  });
  it('Esc e botão fechar fecham', async () => {
    const onClose = vi.fn();
    const { unmount } = render(<Harness onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
    unmount();
    render(<Harness onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fechar o menu' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
  it('arrastar para a esquerda fecha; arrasto curto não', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const d = screen.getByRole('dialog');
    fireEvent.pointerDown(d, { clientX: 300, clientY: 100 });
    fireEvent.pointerMove(d, { clientX: 270, clientY: 100 });
    fireEvent.pointerUp(d);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.pointerDown(d, { clientX: 300, clientY: 100 });
    fireEvent.pointerMove(d, { clientX: 150, clientY: 100 });
    fireEvent.pointerUp(d);
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('itens recebem índice da cascata', () => {
    render(<Harness />);
    const body = screen.getByRole('dialog').querySelector('.remoa-aside-body')!;
    expect((body.children[1] as HTMLElement).style.getPropertyValue('--i')).toBe('1');
  });
  it('favorito e camada são switches que alternam', async () => {
    render(<Harness />);
    const fav = screen.getByRole('switch', { name: 'Favoritar mapa' });
    await userEvent.click(fav);
    expect(fav).toHaveAttribute('aria-checked', 'true');
    const heat = screen.getByRole('switch', { name: /Mapa de calor/ });
    expect(heat).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(heat);
    expect(heat).toHaveAttribute('aria-checked', 'true');
  });
  it('"Em breve" desativa a linha; progresso mostra números', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /Vender na Loja/ })).toBeDisabled();
    expect(screen.getByText('Em breve')).toBeInTheDocument();
    expect(screen.getByText('68%')).toBeInTheDocument();
    expect(screen.getByText('9 Acompanhar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revisar este mapa · 6 hoje' })).toBeInTheDocument();
  });
  it('fechado não renderiza', () => {
    render(<MapAside open={false} onOpenChange={() => {}} label="Menu do mapa" closeLabel="x" backLabel="b" title="t" />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
