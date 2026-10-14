import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { emptyDraft, type StudyDraft } from './autofill';
import { COURSES, UFPR, goalsFor } from './fixtures';
import { resetReference } from './reference';
import { StudyFields } from './study-fields';

const search = vi.fn();
vi.mock('./api', () => ({
  listCourses: async () => ({ ok: true, data: COURSES }),
  listGoals: async (course?: string) => ({ ok: true, data: goalsFor(course) }),
  searchInstitutions: (...a: unknown[]) => search(...a),
}));

let last: StudyDraft = emptyDraft;
function Harness({ initial = emptyDraft }: { initial?: StudyDraft }) {
  const [d, setD] = useState(initial);
  last = d;
  return <StudyFields value={d} onChange={setD} />;
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  search.mockResolvedValue({ ok: true, data: [UFPR] });
  resetReference();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

/** Options highlight the match with <mark>, so pick by text content (prefix). */
async function pickCourse(text: string, option: string) {
  fireEvent.change(screen.getByRole('combobox', { name: 'Curso ou área' }), { target: { value: text } });
  await waitFor(() => expect(screen.getAllByRole('option').some((o) => o.textContent?.startsWith(option))).toBe(true));
  fireEvent.click(screen.getAllByRole('option').find((o) => o.textContent?.startsWith(option))!);
}

describe('StudyFields', () => {
  it('busca sem acento, preenche conselho e objetivo automático; Desfazer remove', async () => {
    render(<Harness />);
    await pickCourse('farmacia', 'Farmácia');
    const auto = screen.getByText('Preenchido automaticamente').parentElement!;
    expect(within(auto).getByText('Conselho: CRF · Conselho Regional de Farmácia')).toBeVisible();
    expect(within(auto).getByText(/Objetivo sugerido: Residência multiprofissional em saúde/)).toBeVisible();
    expect(last.goals).toEqual(['residencia_multiprofissional']);
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(last.goals).toEqual([]);
    expect(screen.queryByText(/Objetivo sugerido/)).toBeNull();
  });

  it('alias acha o curso ("tecnico"); trocar de curso troca só o automático e mantém o escolhido', async () => {
    render(<Harness />);
    await pickCourse('tecnico', 'Técnico(a) em Enfermagem');
    expect(last.course).toBe('nursing_technician');
    await pickCourse('enfermagem', 'Enfermagem');
    expect(last.goals).toEqual(['provas_faculdade']);
    fireEvent.click(await screen.findByRole('button', { name: 'Concursos públicos da saúde' }));
    await pickCourse('medicina', 'Medicina');
    expect(last.goals).toEqual(['concursos_saude']); // the automatic goal goes, the one the user picked stays; no new automatic goal on top of it
    expect(last.council).toBe('CRM');
  });

  it('"Usar o que digitei" vira outro curso com o texto; não é da saúde pergunta "O que você estuda?"', async () => {
    render(<Harness />);
    await pickCourse('Podologia', 'Usar “Podologia”');
    expect(last).toMatchObject({ course: 'other_health', courseOtherText: 'Podologia' });
    expect((screen.getByLabelText('Qual é o seu curso?') as HTMLInputElement).value).toBe('Podologia');
    await pickCourse('direito', 'Não é da área da saúde');
    expect(screen.getByLabelText('O que você estuda?')).toBeVisible();
    expect(screen.queryByLabelText('Qual é o seu curso?')).toBeNull();
  });

  it('instituição da lista preenche cidade, UF e tipo; a própria pede cidade e UF', async () => {
    render(<Harness />);
    const box = screen.getByRole('combobox', { name: 'Instituição de ensino' });
    fireEvent.change(box, { target: { value: 'ufpr' } });
    fireEvent.click(await screen.findByRole('option', { name: /UFPR/ }, { timeout: 2000 }));
    expect(search).toHaveBeenCalledWith('ufpr', undefined, expect.any(AbortSignal));
    expect(screen.getByText('Curitiba, PR · Pública')).toBeVisible();
    expect(last.institution).toEqual(UFPR);
    fireEvent.change(box, { target: { value: 'Faculdade Nova' } });
    fireEvent.click(await screen.findByRole('option', { name: 'Usar “Faculdade Nova”' }, { timeout: 2000 }));
    expect(last).toMatchObject({ institution: null, institutionText: 'Faculdade Nova' });
    fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'Londrina' } });
    fireEvent.change(screen.getByLabelText('UF'), { target: { value: 'pr' } });
    expect(last).toMatchObject({ city: 'Londrina', uf: 'PR' });
  });

  it('situação mostra período (estudante) ou número no conselho (profissional) com aviso de privacidade', async () => {
    render(<Harness />);
    await pickCourse('enfermagem', 'Enfermagem');
    expect(screen.getByRole('group', { name: 'Período atual' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Próximo período' }));
    expect(last.period).toBe(2);
    expect(screen.queryByLabelText('Número no conselho (opcional)')).toBeNull();
    act(() => screen.getByRole('radio', { name: 'Profissional formado(a)' }).click());
    await waitFor(() => expect(screen.getByLabelText('Número no conselho (opcional)')).toBeVisible());
    expect(screen.getByText('Não é obrigatório e não aparece para outras pessoas.')).toBeVisible();
    expect(screen.queryByRole('group', { name: 'Período atual' })).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Onde você se formou' })).toBeVisible();
  });

  it('objetivo próprio: digita, Enter ou "Adicionar" vira chip marcado; desmarcar remove', async () => {
    render(<Harness />);
    await pickCourse('enfermagem', 'Enfermagem');
    const add = screen.getByRole('button', { name: 'Adicionar' });
    expect(add).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Outro objetivo (opcional)'), { target: { value: 'Prova do estágio' } });
    fireEvent.click(add);
    expect(last.customGoals).toEqual(['Prova do estágio']);
    expect((screen.getByLabelText('Outro objetivo (opcional)') as HTMLInputElement).value).toBe('');
    const custom = within(screen.getByRole('group', { name: 'Seus objetivos' })).getByRole('button', { name: 'Prova do estágio' });
    expect(custom).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(screen.getByLabelText('Outro objetivo (opcional)'), { key: 'Enter' }); // empty: nothing added, form not submitted
    expect(last.customGoals).toEqual(['Prova do estágio']);
    fireEvent.click(custom);
    expect(last.customGoals).toEqual([]);
  });

  it('G29: objetivos em chips com nome humano, sugeridos do curso primeiro, contador e limite de 5', async () => {
    render(<Harness />);
    await pickCourse('enfermagem', 'Enfermagem');
    const suggested = screen.getByRole('group', { name: 'Sugeridos para Enfermagem' });
    expect(within(suggested).getAllByRole('button').map((b) => b.textContent)).toEqual(['Provas da faculdade', 'Concursos públicos da saúde']);
    expect(within(suggested).getByRole('button', { name: 'Provas da faculdade' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(within(screen.getByRole('group', { name: 'Outros objetivos' })).queryByRole('button', { name: 'ENAMED' })).toBeNull()); // goal of another course is not offered
    expect(screen.getByText('1 de 5')).toBeVisible();
    for (const g of ['Concursos públicos da saúde', 'Residência multiprofissional em saúde', 'Idiomas']) fireEvent.click(screen.getByRole('button', { name: g }));
    fireEvent.change(screen.getByLabelText('Outro objetivo (opcional)'), { target: { value: 'OSCE' } });
    fireEvent.keyDown(screen.getByLabelText('Outro objetivo (opcional)'), { key: 'Enter' });
    expect(screen.getByText('5 de 5')).toBeVisible();
    expect(screen.getByText('Você já escolheu 5. Desmarque um para trocar.')).toBeVisible();
    expect(screen.getByLabelText('Outro objetivo (opcional)')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Idiomas' }));
    expect(last.goals).not.toContain('idiomas');
  });

  it('G29: instituição abre com uma lista antes de digitar e busca no servidor ao digitar', async () => {
    search.mockResolvedValue({ ok: true, data: [UFPR] });
    render(<Harness />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Instituição de ensino' }));
    expect(await screen.findByRole('option', { name: /UFPR/ }, { timeout: 2000 })).toBeVisible();
    expect(search).toHaveBeenCalledWith('', undefined, expect.any(AbortSignal));
    fireEvent.change(screen.getByRole('combobox', { name: 'Instituição de ensino' }), { target: { value: 'p' } });
    await waitFor(() => expect(search).toHaveBeenCalledWith('p', undefined, expect.any(AbortSignal)));
  });
});
