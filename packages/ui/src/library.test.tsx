import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Accordion } from './accordion';
import { Alert } from './alert';
import { Breadcrumb } from './breadcrumb';
import { Empty } from './empty';
import { Kbd } from './kbd';
import { RadioGroup } from './radio-group';
import { Rating } from './rating';
import { Skeleton } from './skeleton';
import { Spinner } from './spinner';
import { Stat } from './stat';
import { Tabs } from './tabs';
import { violations } from './test-utils';

const labels = { again: 'De novo', hard: 'Difícil', good: 'Bom', easy: 'Fácil' } as const;

describe('biblioteca', () => {
  it('sem violações axe', async () => {
    const { container } = render(
      <div>
        <Alert title="Salvo">Ok</Alert>
        <Stat label="Hoje" value="4" />
        <Empty title="Vazio" />
        <Kbd>K</Kbd>
        <Breadcrumb label="Trilha" items={[{ label: 'Início' }, { label: 'Mapa' }]} />
        <Skeleton lines={2} />
        <Spinner label="Carregando" />
        <Tabs label="Abas" tabs={[{ value: 'a', label: 'A', content: 'Um' }]} />
        <Accordion items={[{ value: 'a', title: 'Título', content: 'Corpo' }]} />
        <RadioGroup label="Modo" options={[{ value: 'a', label: 'A' }]} defaultValue="a" />
        <Rating labels={labels} />
      </div>,
    );
    expect(await violations(container)).toEqual([]);
  });

  it('avisa qual item do accordion abriu', async () => {
    const onValueChange = vi.fn();
    render(<Accordion onValueChange={onValueChange} items={[{ value: 'a', title: 'Título', content: 'Corpo' }]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Título' }));
    expect(onValueChange).toHaveBeenCalledWith('a');
  });

  it('expande o accordion', async () => {
    render(<Accordion items={[{ value: 'a', title: 'Título', content: 'Corpo' }]} />);
    const trigger = screen.getByRole('button', { name: 'Título' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});
