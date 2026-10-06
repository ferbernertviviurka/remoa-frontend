import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { blogCategoryFixtures } from '@remoa/contracts/mocks';
import { ToastProvider } from '@remoa/ui';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }) }));
const blogAction = vi.fn();
vi.mock('../api', () => ({ blogAction: (...a: unknown[]) => blogAction(...a) }));
const { CategoriesSection, countWords } = await import('./categories-section');

const view = () => render(<ToastProvider closeLabel="Fechar" viewportLabel="Avisos"><CategoriesSection categories={blogCategoryFixtures} /></ToastProvider>);
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Categorias do blog', () => {
  it('counts words', () => expect(countWords('  um  dois\ntrês ')).toBe(3));

  it('lists in order and swaps positions with up/down', async () => {
    blogAction.mockResolvedValue({ ok: true, auditId: 'a_1', data: {} });
    view();
    const [a, b] = blogCategoryFixtures;
    expect(screen.getByRole('button', { name: `Subir: ${a!.name}` })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: `Descer: ${a!.name}` }));
    await waitFor(() => expect(blogAction).toHaveBeenCalledTimes(2));
    expect(blogAction).toHaveBeenCalledWith('/categories', expect.objectContaining({ id: a!.id, position: b!.position }));
    expect(blogAction).toHaveBeenCalledWith('/categories', expect.objectContaining({ id: b!.id, position: a!.position }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('new category: slug follows the name, counter shows words, intro outside 150-300 saves as draft', async () => {
    blogAction.mockResolvedValue({ ok: true, auditId: 'a_2', data: {} });
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Nova categoria' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria' });
    fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: 'Saúde Mental' } });
    expect(within(dialog).getByLabelText('Endereço (slug)')).toHaveValue('saude-mental');
    fireEvent.change(within(dialog).getByLabelText('Texto de apresentação'), { target: { value: 'uma duas três' } });
    expect(within(dialog).getByText(/3 palavras/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar categoria' }));
    await waitFor(() => expect(blogAction).toHaveBeenCalledWith('/categories', expect.objectContaining({ name: 'Saúde Mental', slug: 'saude-mental', introDraft: true })));
  });

  it('edit keeps the id and shows an error when the API refuses', async () => {
    blogAction.mockResolvedValue({ ok: false, error: { code: 'conflict', message: 'slug' } });
    view();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Editar ${blogCategoryFixtures[0]!.name}`) }));
    const dialog = await screen.findByRole('dialog', { name: 'Editar categoria' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar categoria' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Não foi possível salvar');
    expect(blogAction).toHaveBeenCalledWith('/categories', expect.objectContaining({ id: blogCategoryFixtures[0]!.id }));
  });
});
