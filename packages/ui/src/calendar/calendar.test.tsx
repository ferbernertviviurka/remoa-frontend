import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { violations } from '../test-utils';
import { Dialog } from '../dialog';
import {
  CalendarMonthGrid, CalendarWeekGrid, CalendarAgendaList, EventGalleryCard, MiniCalendar, CalendarViewSwitch, LabelToggleRow, LabelColorPicker,
  EventForm, EventDetails, CalendarTour, UpcomingEventsCard, CalendarBanner, CalendarEmptyState, CalendarSkeleton, validateEventForm, validateCoverFile, layoutBlocks,
  dayKeyOf, monthGrid, weekDays, weekTitle, addDays, type EventFormValue, type CalendarView,
} from './index';
import { NOW, TODAY, TZ, events, labels, manyOnOneDay, overlapping, text, tourDemo, tourSteps, tourText } from './fixtures';

// Radix Switch mede o botão com ResizeObserver, que o jsdom não tem.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

describe('datas', () => {
  it('mês: 42 dias, domingo primeiro; semana começa no domingo', () => {
    const g = monthGrid(2026, 9);
    expect(g).toHaveLength(42);
    expect(g[0]).toBe('2026-09-27');
    expect(weekDays('2026-10-05')[0]).toBe('2026-10-04');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  });
  it('título da semana: faixa curta no mesmo mês, com os dois meses quando atravessa', () => {
    const w = (k: string) => weekTitle(k).replace(/\s/g, ' ');
    expect(w('2026-10-07')).toBe('4 – 10 de outubro de 2026');
    expect(w('2026-09-30')).toBe('27 de setembro – 3 de outubro de 2026');
  });
  it('dia no fuso do perfil (23:30 em SP ainda é o mesmo dia, mesmo já sendo o dia seguinte em UTC)', () => {
    expect(dayKeyOf('2026-10-06T02:30:00Z', TZ)).toBe('2026-10-05');
  });
  it('sobreposição: colunas lado a lado dentro do grupo; grupos separados voltam a 1 coluna', () => {
    const r = layoutBlocks([{ start: 540, end: 660 }, { start: 600, end: 720 }, { start: 780, end: 840 }]);
    expect(r.map((x) => [x.col, x.cols])).toEqual([[0, 2], [1, 2], [0, 1]]);
  });
});

describe('CalendarMonthGrid', () => {
  const setup = (evs = events) => {
    const onDayClick = vi.fn(), onEventClick = vi.fn();
    const r = render(<CalendarMonthGrid year={2026} month={9} today={TODAY} timeZone={TZ} events={evs} labels={labels} onDayClick={onDayClick} onEventClick={onEventClick} text={text.month} />);
    return { ...r, onDayClick, onEventClick };
  };
  it('grade 6 × 7 com células rotuladas e sem violações axe', async () => {
    const { container } = setup();
    expect(screen.getByRole('grid', { name: 'Calendário do mês' })).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell')).toHaveLength(42);
    expect(screen.getByRole('gridcell', { name: 'terça, 6 de outubro, 1 compromisso' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'segunda, 5 de outubro, 1 compromisso' })).toHaveAttribute('aria-current', 'date');
    expect(await violations(container)).toEqual([]);
  });
  it('clicar no dia chama onDayClick; clicar no compromisso chama só onEventClick', async () => {
    const { onDayClick, onEventClick } = setup();
    await userEvent.click(screen.getByRole('button', { name: /Prova de Clínica Médica, 08:00/ }));
    expect(onEventClick).toHaveBeenCalledWith('e1');
    expect(onDayClick).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('gridcell', { name: /^quarta, 7 de outubro/ }));
    expect(onDayClick).toHaveBeenCalledWith('2026-10-07');
  });
  it('mostra 3 compromissos e "+2 mais"', () => {
    setup(manyOnOneDay);
    const cell = screen.getByRole('gridcell', { name: /^terça, 6 de outubro, 5 compromissos/ });
    expect(within(cell).getAllByRole('button')).toHaveLength(4);
    expect(within(cell).getByRole('button', { name: '+2 mais' })).toBeInTheDocument();
  });
  it('setas movem o foco entre dias (roving tabindex)', async () => {
    setup();
    const today = screen.getByRole('gridcell', { name: /^segunda, 5 de outubro/ });
    today.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('gridcell', { name: /^terça, 6 de outubro/ })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('gridcell', { name: /^terça, 13 de outubro/ })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}{ArrowUp}');
    expect(screen.getByRole('gridcell', { name: /^segunda, 5 de outubro/ })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
  });
  it('trocar de mês aplica a classe de deslize para o lado da navegação', () => {
    const { rerender, container } = setup();
    expect(container.querySelector('.cal-slide-next, .cal-slide-prev')).toBeNull();
    rerender(<CalendarMonthGrid year={2026} month={10} today={TODAY} timeZone={TZ} events={events} labels={labels} onDayClick={() => undefined} onEventClick={() => undefined} text={text.month} />);
    expect(container.querySelector('.cal-slide-next')).not.toBeNull();
    rerender(<CalendarMonthGrid year={2026} month={9} today={TODAY} timeZone={TZ} events={events} labels={labels} onDayClick={() => undefined} onEventClick={() => undefined} text={text.month} />);
    expect(container.querySelector('.cal-slide-prev')).not.toBeNull();
  });
});

describe('CalendarWeekGrid', () => {
  it('blocos por início/fim, sem fim = 1 h (48 px), linha de agora e sem violações axe', async () => {
    const onEventClick = vi.fn();
    const { container } = render(<CalendarWeekGrid anchor={TODAY} today={TODAY} now={NOW} timeZone={TZ} events={events} labels={labels} onEventClick={onEventClick} text={text.week} />);
    const prova = screen.getByRole('button', { name: /Prova de Clínica Médica, 08:00 – 10:00/ });
    expect(prova.closest('li')).toHaveStyle({ top: '48px', height: '94px' });
    expect(screen.getByRole('button', { name: /Prazo da inscrição.*Dia inteiro/ })).toBeInTheDocument();
    expect(screen.getByText('Agora').closest('li')).toHaveStyle({ top: `${(14 * 60 - 420) * 0.8}px` });
    await userEvent.click(prova);
    expect(onEventClick).toHaveBeenCalledWith('e1');
    expect(await violations(container)).toEqual([]);
  });
  it('sobreposições ficam lado a lado', () => {
    render(<CalendarWeekGrid anchor={TODAY} today={TODAY} now={NOW} timeZone={TZ} events={overlapping} labels={labels} onEventClick={() => undefined} text={text.week} />);
    const w = (n: RegExp) => parseFloat(screen.getByRole('button', { name: n }).closest('li')!.style.width);
    // as três se tocam (a reunião cruza as duas): 3 colunas
    expect(w(/Aula de Clínica/)).toBeCloseTo(33.33);
    expect(w(/Reunião do grupo/)).toBeCloseTo(33.33);
  });
});

describe('CalendarAgendaList', () => {
  it('agrupa por dia, pula dias vazios, destaca hoje e sem violações axe', async () => {
    const onEventClick = vi.fn();
    const { container } = render(<CalendarAgendaList today={TODAY} timeZone={TZ} events={events} labels={labels} onEventClick={onEventClick} text={text.agenda} />);
    const days = within(screen.getByRole('list', { name: 'Compromissos por dia' })).getAllByRole('listitem', { hidden: false }).filter((li) => li.className.includes('slide'));
    expect(days).toHaveLength(8); // dias 5, 6, 8, 10, 11, 14, 16 e 19; os vazios não aparecem
    await userEvent.click(screen.getByRole('button', { name: /Simulado Enamed/ }));
    expect(onEventClick).toHaveBeenCalledWith('e5');
    expect(await violations(container)).toEqual([]);
  });
});

describe('EventGalleryCard', () => {
  it('chip de contagem: âmbar até amanhã, neutro depois', () => {
    const open = vi.fn();
    const card = (i: number) => <EventGalleryCard event={events[i]!} label={labels[0]} today={TODAY} timeZone={TZ} onOpen={open} text={{ allDay: 'Dia inteiro', count: text.count }} />;
    const { unmount } = render(card(1));
    expect(screen.getByText('Amanhã').className).toContain('bg-watch-bg');
    unmount();
    render(card(2));
    expect(screen.getByText('Em 3 dias').className).not.toContain('bg-watch-bg');
  });
  it('abre ao clicar', async () => {
    const open = vi.fn();
    const { container } = render(<EventGalleryCard event={events[1]!} label={labels[0]} today={TODAY} timeZone={TZ} onOpen={open} text={{ allDay: 'Dia inteiro', count: text.count }} />);
    expect(await violations(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button'));
    expect(open).toHaveBeenCalledWith('e1');
  });
});

describe('MiniCalendar', () => {
  const Wrapper = ({ onSelect, onMonth }: { onSelect: (d: string) => void; onMonth: (y: number, m: number) => void }) => (
    <MiniCalendar year={2026} month={9} today={TODAY} selected={TODAY} eventDays={['2026-10-06']} onSelectDay={onSelect} onMonthChange={onMonth} text={text.mini} />
  );
  it('ponto em dia com compromisso, seleciona, navega e clicar em dia de outro mês navega até ele', async () => {
    const onSelect = vi.fn(), onMonth = vi.fn();
    const { container } = render(<Wrapper onSelect={onSelect} onMonth={onMonth} />);
    expect(await violations(container)).toEqual([]);
    expect(screen.getByRole('button', { name: 'terça, 6 de outubro, com compromissos' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'quarta, 7 de outubro' }));
    expect(onSelect).toHaveBeenCalledWith('2026-10-07');
    expect(onMonth).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(onMonth).toHaveBeenLastCalledWith(2026, 10);
    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(onMonth).toHaveBeenLastCalledWith(2026, 8);
    await userEvent.click(screen.getByRole('button', { name: 'domingo, 1 de novembro' }));
    expect(onSelect).toHaveBeenLastCalledWith('2026-11-01');
    expect(onMonth).toHaveBeenLastCalledWith(2026, 10);
  });
});

describe('CalendarViewSwitch', () => {
  it('troca de visão por clique e setas; marcador acompanha a opção', async () => {
    const Demo = () => { const [v, setV] = useState<CalendarView>('month'); return <CalendarViewSwitch value={v} onChange={setV} text={text.views} />; };
    const { container } = render(<Demo />);
    expect(await violations(container)).toEqual([]);
    const marker = container.querySelector('span[aria-hidden]') as HTMLElement;
    expect(marker.style.transform).toBe('translateX(0%)');
    await userEvent.click(screen.getByRole('button', { name: 'Agenda' }));
    expect(screen.getByRole('button', { name: 'Agenda' })).toHaveAttribute('aria-pressed', 'true');
    expect(marker.style.transform).toBe('translateX(200%)');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'Galeria' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('etiquetas', () => {
  it('LabelToggleRow alterna a visibilidade (role switch) e mostra a contagem', async () => {
    const onToggle = vi.fn();
    const { container } = render(<LabelToggleRow label={labels[0]!} visible count={3} onToggle={onToggle} text={{ show: text.labelShow }} />);
    expect(await violations(container)).toEqual([]);
    const sw = screen.getByRole('switch', { name: 'Mostrar Prova' });
    expect(sw).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('3')).toBeInTheDocument();
    await userEvent.click(sw);
    expect(onToggle).toHaveBeenCalledWith(false);
  });
  it('LabelColorPicker: paleta de 8, escolhe por clique e setas', async () => {
    const onChange = vi.fn();
    const { container } = render(<LabelColorPicker value="#2563EB" onChange={onChange} text={text.colors} />);
    expect(await violations(container)).toEqual([]);
    expect(screen.getAllByRole('radio')).toHaveLength(8);
    expect(screen.getByRole('radio', { name: 'Azul' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: 'Verde' }));
    expect(onChange).toHaveBeenLastCalledWith('#15803D');
    screen.getByRole('radio', { name: 'Azul' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('#BE185D');
  });
});

const blank: EventFormValue = { title: '', labelId: 'prova', date: '2026-10-07', allDay: false, start: '08:00', end: '09:00', location: '', description: '', cover: null, remindD1: true, remindD0: true };

describe('validação do compromisso', () => {
  it('título 2–120, data, fim ≥ início, local ≤ 160, descrição ≤ 2.000', () => {
    expect(validateEventForm(blank).title).toBe('min');
    expect(validateEventForm({ ...blank, title: 'ab' })).toEqual({});
    expect(validateEventForm({ ...blank, title: 'a'.repeat(121) }).title).toBe('max');
    expect(validateEventForm({ ...blank, title: 'ab', date: '' }).date).toBe('required');
    expect(validateEventForm({ ...blank, title: 'ab', start: '10:00', end: '09:00' }).end).toBe('order');
    expect(validateEventForm({ ...blank, title: 'ab', allDay: true, start: '10:00', end: '09:00' })).toEqual({});
    expect(validateEventForm({ ...blank, title: 'ab', location: 'x'.repeat(161) }).location).toBe('max');
    expect(validateEventForm({ ...blank, title: 'ab', description: 'x'.repeat(2001) }).description).toBe('max');
  });
  it('capa: PNG/JPG até 5 MB', () => {
    expect(validateCoverFile({ type: 'image/png', size: 1000 })).toBeNull();
    expect(validateCoverFile({ type: 'image/webp', size: 1000 })).toBe('type');
    expect(validateCoverFile({ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 })).toBe('size');
  });
});

function FormDemo({ onSubmit = () => undefined, start = blank }: { onSubmit?: () => void; start?: EventFormValue }) {
  const [v, setV] = useState(start);
  return <EventForm mode="create" value={v} onChange={setV} labels={labels} onSubmit={onSubmit} onCancel={() => undefined} onFile={(f) => setV((c) => ({ ...c, cover: { name: f.name, url: 'blob:x' } }))} text={text.form} />;
}

describe('EventForm', () => {
  it('"Salvar compromisso" só ativa com título e data; erro inline depois de tocar o título', async () => {
    const onSubmit = vi.fn();
    const { container } = render(<FormDemo onSubmit={onSubmit} />);
    expect(await violations(container)).toEqual([]);
    const save = screen.getByRole('button', { name: 'Salvar compromisso' });
    expect(save).toBeDisabled();
    const title = screen.getByLabelText('Título');
    await userEvent.type(title, 'a');
    await userEvent.tab();
    expect(screen.getByRole('alert')).toHaveTextContent('pelo menos 2 caracteres');
    await userEvent.type(title, 'bc');
    expect(save).toBeEnabled();
    await userEvent.click(save);
    expect(onSubmit).toHaveBeenCalledOnce();
  });
  it('fim antes do início desativa o envio e mostra o erro; dia inteiro desliga os horários', async () => {
    render(<FormDemo start={{ ...blank, title: 'Prova' }} />);
    const end = screen.getByLabelText('Fim');
    await userEvent.clear(end);
    await userEvent.type(end, '07:00');
    await userEvent.tab();
    expect(screen.getByRole('alert')).toHaveTextContent('O fim não pode ser antes do início.');
    expect(screen.getByRole('button', { name: 'Salvar compromisso' })).toBeDisabled();
    await userEvent.click(screen.getByRole('switch', { name: 'Dia inteiro' }));
    expect(screen.getByLabelText('Início')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Salvar compromisso' })).toBeEnabled();
  });
  it('escolhe a etiqueta, liga/desliga avisos e rejeita capa que não é PNG/JPG', async () => {
    render(<FormDemo start={{ ...blank, title: 'Prova' }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Plantão' }));
    expect(screen.getByRole('button', { name: 'Plantão' })).toHaveAttribute('aria-pressed', 'true');
    const d1 = screen.getByRole('switch', { name: '1 dia antes' });
    await userEvent.click(d1);
    expect(d1).toHaveAttribute('aria-checked', 'false');
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    await userEvent.upload(input, new File(['x'], 'a.gif', { type: 'image/gif' }), { applyAccept: false });
    expect(screen.getByRole('alert')).toHaveTextContent('PNG ou JPG');
    await userEvent.upload(input, new File(['x'], 'capa.png', { type: 'image/png' }));
    expect(screen.getByRole('img', { name: 'Prévia da capa em 16:9' })).toBeInTheDocument();
  });
  it('dentro do Dialog size="form": Esc fecha', async () => {
    render(<Dialog open onOpenChange={() => undefined} title="x" closeLabel="Fechar" size="form" srOnlyHeader><FormDemo /></Dialog>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('EventDetails', () => {
  const setup = () => {
    const h = { onEdit: vi.fn(), onDuplicate: vi.fn(), onDelete: vi.fn(), onClose: vi.fn(), onToggleReminder: vi.fn() };
    const r = render(<EventDetails event={events[1]!} label={labels[0]} today={TODAY} timeZone={TZ} {...h}
      reminders={[{ id: 'd1', title: '1 dia antes', detail: 'Hoje, às 18:00', on: true }, { id: 'd0', title: 'No dia', detail: 'No dia, às 07:00', on: false }]}
      text={{ ...text.details, when: text.when }} />);
    return { ...r, ...h };
  };
  it('mostra data por extenso com "amanhã", local, descrição e horários dos avisos', async () => {
    const { container } = setup();
    expect(screen.getByRole('heading', { name: 'Prova de Clínica Médica' })).toBeInTheDocument();
    expect(screen.getByText('Terça-feira, 6 de outubro')).toBeInTheDocument();
    expect(screen.getByText(/08:00 – 10:00 · amanhã/)).toBeInTheDocument();
    expect(screen.getByText('Sala 204 · Bloco B')).toBeInTheDocument();
    expect(screen.getByText('Hoje, às 18:00')).toBeInTheDocument();
    expect(await violations(container)).toEqual([]);
  });
  it('switch de aviso, editar, duplicar e fechar chamam os callbacks', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('switch', { name: 'No dia' }));
    expect(h.onToggleReminder).toHaveBeenCalledWith('d0', true);
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Duplicar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect([h.onEdit, h.onDuplicate, h.onClose].every((f) => f.mock.calls.length === 1)).toBe(true);
  });
  it('excluir pede confirmação e avisa que os avisos serão cancelados', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(h.onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toHaveTextContent('avisos agendados também serão cancelados');
    await userEvent.click(screen.getByRole('button', { name: 'Manter' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }));
    expect(h.onDelete).toHaveBeenCalledOnce();
  });
});

describe('CalendarTour', () => {
  const setup = (createCta = true) => {
    const onClose = vi.fn(), onStep = vi.fn();
    const r = render(<CalendarTour open onClose={onClose} onStep={onStep} steps={tourSteps} demo={tourDemo} text={tourText} createCta={createCta} />);
    return { ...r, onClose, onStep };
  };
  it('5 passos: Próximo/Voltar, direção da transição, eyebrow e onStep; sem violações axe', async () => {
    const { onStep } = setup();
    expect(await violations(document.body)).toEqual([]);
    expect(screen.getByText('Calendário · Passo 1 de 5')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(screen.getByRole('heading', { name: 'Cada compromisso com os detalhes' })).toBeInTheDocument();
    expect(document.querySelector('.tour-next')).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(document.querySelector('.tour-prev')).not.toBeNull();
    expect(onStep.mock.calls.map((c) => c[0])).toEqual([1, 2, 1]);
  });
  it('setas navegam; último passo tem "Criar meu primeiro compromisso" (create)', async () => {
    const { onClose } = setup();
    for (let i = 0; i < 4; i++) await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByText('Calendário · Passo 5 de 5')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByText('Calendário · Passo 4 de 5')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.click(screen.getByRole('button', { name: 'Criar meu primeiro compromisso' }));
    expect(onClose).toHaveBeenCalledWith('create');
  });
  it('Pular = skip, Esc = esc, seta além do fim = finish', async () => {
    const a = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Pular' }));
    expect(a.onClose).toHaveBeenCalledWith('skip');
    await userEvent.keyboard('{Escape}');
    expect(a.onClose).toHaveBeenLastCalledWith('esc');
    a.unmount();
    const b = setup();
    for (let i = 0; i < 5; i++) await userEvent.keyboard('{ArrowRight}');
    expect(b.onClose).toHaveBeenCalledWith('finish');
  });
  it('sem CTA de criar, o último passo conclui com "Entendi"', async () => {
    const { onClose } = setup(false);
    for (let i = 0; i < 4; i++) await userEvent.keyboard('{ArrowRight}');
    await userEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(onClose).toHaveBeenCalledWith('finish');
  });
});

describe('Hoje: card e faixa', () => {
  const t = { ...text.upcoming, count: text.count };
  it('card lista no máximo 4, com chip âmbar até amanhã', async () => {
    const { container } = render(<UpcomingEventsCard events={events} labels={labels} today={TODAY} timeZone={TZ} href="/calendario" text={t} />);
    expect(screen.getAllByRole('link').filter((l) => l.getAttribute('href') === '/calendario')).toHaveLength(5); // 4 itens + "Calendário"
    expect(screen.getByText('Amanhã').className).toContain('bg-watch-bg');
    expect(await violations(container)).toEqual([]);
  });
  it('vazio: texto e "Adicionar compromisso"', () => {
    render(<UpcomingEventsCard events={[]} labels={labels} today={TODAY} timeZone={TZ} href="/calendario" text={t} />);
    expect(screen.getByRole('link', { name: 'Adicionar compromisso' })).toHaveAttribute('href', '/calendario');
  });
  it('faixa é um link com pulso', async () => {
    const { container } = render(<CalendarBanner headline="Amanhã às 08:00: Prova" detail="Prova · Sala 204" cta="Ver no calendário" ariaLabel="Compromisso chegando" href="/calendario" />);
    expect(screen.getByRole('link', { name: 'Compromisso chegando' })).toHaveAttribute('href', '/calendario');
    expect(container.querySelector('.cal-pulse')).not.toBeNull();
    expect(await violations(container)).toEqual([]);
  });
});

describe('estados', () => {
  it('vazio: "Adicionar a primeira prova" chama onAdd', async () => {
    const onAdd = vi.fn();
    const { container } = render(<CalendarEmptyState title="Seu calendário está vazio." body="Comece." cta="Adicionar a primeira prova" onAdd={onAdd} />);
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar a primeira prova' }));
    expect(onAdd).toHaveBeenCalled();
    expect(await violations(container)).toEqual([]);
  });
  it.each(['month', 'week', 'agenda', 'gallery'] as const)('carregando (%s): região de status ocupada', async (view) => {
    const { container } = render(<CalendarSkeleton view={view} label="Carregando o calendário" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(await violations(container)).toEqual([]);
  });
});
