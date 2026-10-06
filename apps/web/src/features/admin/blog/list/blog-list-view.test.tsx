import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { AdminSitemap, BlogAdminList } from '@remoa/contracts';
import { blogListItemFixtures, sitemapStatusFixture } from '@remoa/contracts/mocks';
import { ToastProvider } from '@remoa/ui';

const replace = vi.fn();
const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push, refresh }), usePathname: () => '/admin/blog', useSearchParams: () => new URLSearchParams('') }));
const blogAction = vi.fn();
vi.mock('../api', () => ({ blogAction: (...a: unknown[]) => blogAction(...a) }));
const { BlogListView } = await import('./blog-list-view');

const [published, draft] = blogListItemFixtures;
const data: BlogAdminList = { items: blogListItemFixtures, total: 2, page: 1, pageSize: 25, counts: { all: 2, published: 1, scheduled: 0, draft: 1, archived: 0 } };
const sitemap: AdminSitemap = { status: sitemapStatusFixture, entries: [] };
const wrap = (ui: ReactNode) => <ToastProvider closeLabel="Fechar" viewportLabel="Avisos">{ui}</ToastProvider>;
const view = () => render(wrap(<BlogListView data={data} error={null} sitemap={sitemap} status="all" page={1} />));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Admin do blog: lista', () => {
  it('filters go to the URL; "Ver" only for published posts', () => {
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Rascunhos' }));
    expect(replace).toHaveBeenCalledWith('/admin/blog?status=draft', { scroll: false });
    const rows = screen.getAllByRole('row').slice(1);
    expect(within(rows[0]!).getByRole('link', { name: 'Ver' })).toHaveAttribute('href', `/blog/${published!.slug}`);
    expect(within(rows[1]!).queryByRole('link', { name: 'Ver' })).toBeNull();
    expect(within(rows[1]!).queryByRole('button', { name: /Despublicar/ })).toBeNull();
  });

  it('duplicate creates the copy and opens the editor', async () => {
    blogAction.mockResolvedValue({ ok: true, auditId: 'a_1', data: { post: { id: 'new-id' } } });
    view();
    fireEvent.click(screen.getByRole('button', { name: `Duplicar: ${draft!.title}` }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/blog/new-id'));
    expect(blogAction).toHaveBeenCalledWith(`/posts/${draft!.id}/duplicate`);
  });

  it('unpublish needs a reason of 8+ characters before calling the API', async () => {
    blogAction.mockResolvedValue({ ok: true, auditId: 'a_1050', data: {} });
    view();
    fireEvent.click(screen.getByRole('button', { name: `Despublicar: ${published!.title}` }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.change(within(dialog).getByLabelText('Motivo (obrigatório)'), { target: { value: 'curto' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Despublicar e registrar' }));
    expect(blogAction).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText('Motivo (obrigatório)'), { target: { value: 'Erro de dose no texto' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Despublicar e registrar' }));
    await waitFor(() => expect(blogAction).toHaveBeenCalledWith(`/posts/${published!.id}/unpublish`, { reason: 'Erro de dose no texto' }));
    expect(await within(dialog).findByRole('status')).toHaveTextContent('a_1050');
  });

  it('unpublish shows the re-login message on reauth_required', async () => {
    blogAction.mockResolvedValue({ ok: false, error: { code: 'reauth_required', message: 'x' } });
    view();
    fireEvent.click(screen.getByRole('button', { name: `Despublicar: ${published!.title}` }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.change(within(dialog).getByLabelText('Motivo (obrigatório)'), { target: { value: 'Erro de dose no texto' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Despublicar e registrar' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('autenticação recente');
  });

  it('new post: button stays off with a short title, then creates and opens the editor', async () => {
    blogAction.mockResolvedValue({ ok: true, auditId: 'a_2', data: { post: { id: 'p9' } } });
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Novo post' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo post' });
    const create = within(dialog).getByRole('button', { name: 'Criar e abrir o editor' });
    fireEvent.change(within(dialog).getByLabelText('Título'), { target: { value: 'Curto' } });
    expect(create).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Título'), { target: { value: 'Como montar um mapa de estudo' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Guia/ }));
    expect(create).toBeEnabled();
    fireEvent.click(create);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/blog/p9'));
    expect(blogAction).toHaveBeenCalledWith('/posts', { title: 'Como montar um mapa de estudo', template: 'guia' });
  });

  it('"Atualizar agora" calls the regenerate action and refreshes', async () => {
    blogAction.mockResolvedValue({ ok: true, auditId: 'a_3', data: {} });
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar agora' }));
    await waitFor(() => expect(blogAction).toHaveBeenCalledWith('/sitemap/regenerate'));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(await screen.findByText('Sitemap atualizado')).toBeInTheDocument();
  });

  it('shows an error state with retry when the list fails', () => {
    render(wrap(<BlogListView data={null} error="internal" sitemap={null} status="all" page={1} />));
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os posts');
  });
});
