import { createRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Avatar } from '../avatar';
import { Switch } from '../switch';
import { violations } from '../test-utils';
import {
  AvatarCropper, ChoiceChip, CompletenessRing, DangerCard, InlineField, NumberStepper, PasswordMeter, SettingsNav, SettingsNavAction, UsageMeter, UsageWarning,
  type AvatarCropperHandle,
} from './index';

describe('Avatar', () => {
  it('iniciais com rótulo e tamanho', () => {
    const { container } = render(<Avatar name="Ana Lima" fallback="AL" size={108} color={4} plain />);
    expect(screen.getByRole('img', { name: 'Ana Lima' })).toHaveTextContent('AL');
    expect(container.firstElementChild).toHaveStyle({ width: '108px', height: '108px' });
    expect(container.firstElementChild).toHaveClass('bg-avatar-4');
  });
});

describe('Switch lg', () => {
  it('alterna e tem rótulo', async () => {
    const fn = vi.fn();
    const { container } = render(<Switch label="Reduzir movimento" size="lg" onCheckedChange={fn} />);
    await userEvent.click(screen.getByRole('switch', { name: 'Reduzir movimento' }));
    expect(fn).toHaveBeenCalledWith(true);
    expect(await violations(container)).toEqual([]);
  });
});

describe('CompletenessRing', () => {
  it('anima até o valor e expõe o rótulo', async () => {
    const { container } = render(<CompletenessRing value={60} label="Perfil 60% completo"><Avatar name="Ana" fallback="A" size={108} plain /></CompletenessRing>);
    expect(screen.getByRole('img', { name: 'Perfil 60% completo' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('completeness-arc').getAttribute('stroke-dasharray')).toMatch(/^233\.\d 389\.6$/));
    expect(await violations(container)).toEqual([]);
  });
});

describe('NumberStepper', () => {
  const setup = (value: number) => {
    const onChange = vi.fn();
    const onLimit = vi.fn();
    render(<NumberStepper label="Cards novos por dia" value={value} min={5} max={10} step={5} onChange={onChange} onLimit={onLimit} decLabel="Menos" incLabel="Mais" />);
    return { onChange, onLimit };
  };
  it('muda de passo em passo', async () => {
    const { onChange } = setup(5);
    await userEvent.click(screen.getByRole('button', { name: 'Mais' }));
    expect(onChange).toHaveBeenCalledWith(10);
    expect(screen.getByRole('button', { name: 'Menos' })).toBeDisabled();
  });
  it('no teto chama onLimit e não onChange', async () => {
    const { onChange, onLimit } = setup(10);
    await userEvent.click(screen.getByRole('button', { name: 'Mais' }));
    expect(onLimit).toHaveBeenCalledWith(10);
    expect(onChange).not.toHaveBeenCalled();
  });
  it('sem violações axe', async () => {
    const { container } = render(<NumberStepper label="N" value={5} min={5} max={10} step={5} onChange={() => undefined} decLabel="Menos" incLabel="Mais" />);
    expect(await violations(container)).toEqual([]);
  });
});

describe('PasswordMeter', () => {
  const checks = [{ id: 'len', label: '8 ou mais caracteres', ok: true }, { id: 'mix', label: 'Letras e números', ok: false }];
  it('mostra força em texto, segmentos e checklist', async () => {
    const { container } = render(<PasswordMeter score={3} label="Boa" checks={checks} doneLabel="cumprido" todoLabel="pendente" />);
    expect(screen.getByRole('status')).toHaveTextContent('Boa');
    expect(screen.getAllByTestId('pw-seg').filter((s) => s.dataset.on === 'true')).toHaveLength(3);
    expect(screen.getByText('8 ou mais caracteres').parentElement).toHaveTextContent('cumprido');
    expect(screen.getByText('Letras e números').parentElement).toHaveTextContent('pendente');
    expect(await violations(container)).toEqual([]);
  });
});

describe('InlineField', () => {
  it('expande, fecha e devolve o foco ao Editar', async () => {
    render(
      <InlineField label="Nome" value="Ana" editLabel="Editar" editAriaLabel="Editar nome">
        {({ close }) => <button type="button" onClick={close}>Cancelar</button>}
      </InlineField>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Editar nome' }));
    expect(screen.queryByRole('button', { name: 'Editar nome' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Editar nome' })).toHaveFocus();
  });
  it('onEdit substitui a expansão', async () => {
    const onEdit = vi.fn();
    render(<InlineField label="Foto" value="x" editLabel="Alterar" onEdit={onEdit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Alterar' }));
    expect(onEdit).toHaveBeenCalled();
  });
});

describe('ChoiceChip', () => {
  it('escolha única com setas e sem desmarcar', async () => {
    const fn = vi.fn();
    const { container } = render(<ChoiceChip label="Objetivo" value="a" onValueChange={fn} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} />);
    expect(screen.getByRole('radiogroup', { name: 'Objetivo' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'A' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'B' }));
    expect(fn).toHaveBeenCalledWith('b');
    await userEvent.click(screen.getByRole('radio', { name: 'A' }));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(await violations(container)).toEqual([]);
  });
});

describe('UsageMeter', () => {
  it('barra em scaleX do valor e aviso', async () => {
    const { container } = render(<UsageMeter label="Cards" sub="Total" value="168 de 200" percent={84} tone="warn" warning={<UsageWarning action={<button type="button">Ver o Pro</button>}>Perto do limite.</UsageWarning>} />);
    expect(screen.getByTestId('usage-fill')).toHaveStyle({ transform: 'scaleX(0.84)' });
    expect(screen.getByText('168 de 200')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver o Pro' })).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
  it('ilimitado enche a barra', () => {
    render(<UsageMeter label="Mapas" value="Ilimitados" percent={0} tone="unlimited" />);
    expect(screen.getByTestId('usage-fill')).toHaveStyle({ transform: 'scaleX(1)' });
  });
});

describe('SettingsNav', () => {
  it('links com aria-current, componente de link e rodapé', async () => {
    const onOut = vi.fn();
    const items = [{ id: 'a', href: '/conta', label: 'Perfil', current: true }, { id: 'b', href: '/conta/plano', label: 'Plano', chip: 'Free' }];
    const { container } = render(<SettingsNav label="Seções" items={items} footer={<SettingsNavAction onClick={onOut}>Sair da conta</SettingsNavAction>} />);
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Plano/ })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /Plano/ })).toHaveTextContent('Free');
    await userEvent.click(screen.getByRole('button', { name: 'Sair da conta' }));
    expect(onOut).toHaveBeenCalled();
    expect(await violations(container)).toEqual([]);
  });
  it('usa linkComponent', () => {
    render(<SettingsNav label="S" items={[{ id: 'a', href: '/x', label: 'X' }]} linkComponent={({ children, href }) => <a href={href} data-custom>{children}</a>} />);
    expect(screen.getByRole('link', { name: 'X' })).toHaveAttribute('data-custom');
  });
});

describe('DangerCard', () => {
  it('título, descrição e ação', async () => {
    const { container } = render(<DangerCard title="Excluir conta" description="Apaga tudo."><button type="button">Excluir</button></DangerCard>);
    expect(screen.getByRole('region', { name: 'Excluir conta' })).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
});

describe('AvatarCropper', () => {
  const setup = (w = 400, h = 200) => {
    const ref = createRef<AvatarCropperHandle>();
    const onChange = vi.fn();
    render(<AvatarCropper ref={ref} src="blob:x" areaLabel="Área da foto" zoomLabel="Zoom" onChange={onChange} />);
    const img = screen.getByTestId('crop-image');
    Object.defineProperty(img, 'naturalWidth', { value: w });
    Object.defineProperty(img, 'naturalHeight', { value: h });
    fireEvent.load(img);
    return { ref, onChange, img };
  };
  it('setas movem e respeitam o limite; zoom em passo de 5', async () => {
    const { img, onChange } = setup();
    const area = screen.getByRole('group', { name: 'Área da foto' });
    area.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(img.style.transform).toContain('translate(10px, 0px)');
    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}');
    expect(img.style.transform).toContain('translate(10px, 0px)'); // imagem 400x200 não tem folga vertical
    expect(onChange).toHaveBeenCalled();
    const zoom = screen.getByLabelText('Zoom');
    expect(zoom).toHaveAttribute('min', '100');
    expect(zoom).toHaveAttribute('max', '200');
    expect(zoom).toHaveAttribute('step', '5');
    fireEvent.change(zoom, { target: { value: '150' } });
    expect(zoom).toHaveValue('150');
  });
  it('arrastar com o ponteiro posiciona', () => {
    const { img } = setup();
    const area = screen.getByRole('group', { name: 'Área da foto' });
    // jsdom não tem PointerEvent: MouseEvent com o nome do evento carrega clientX/Y
    const fire = (type: string, x: number) => fireEvent(area, new MouseEvent(type, { bubbles: true, clientX: x, clientY: 100 }));
    fire('pointerdown', 100);
    fire('pointermove', 130);
    fire('pointerup', 130);
    fire('pointermove', 200);
    expect(img.style.transform).toContain('translate(30px, 0px)');
  });
  it('exporta WebP 512 x 512 qualidade 0,85', async () => {
    const draw = vi.fn();
    const toBlob = vi.fn<HTMLCanvasElement['toBlob']>((cb) => cb(new Blob(['x'], { type: 'image/webp' })));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: draw } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(toBlob);
    const { ref } = setup(200, 200);
    const blob = await ref.current?.exportBlob();
    expect(blob?.type).toBe('image/webp');
    expect(toBlob.mock.calls[0]?.[1]).toBe('image/webp');
    expect(toBlob.mock.calls[0]?.[2]).toBe(0.85);
    expect(draw.mock.calls[0]?.slice(1)).toEqual([0, 0, 200, 200, 0, 0, 512, 512]);
    vi.restoreAllMocks();
  });
  it('sem axe', async () => {
    const { container } = render(<AvatarCropper src="blob:x" areaLabel="Área" zoomLabel="Zoom" />);
    expect(await violations(container)).toEqual([]);
  });
});
