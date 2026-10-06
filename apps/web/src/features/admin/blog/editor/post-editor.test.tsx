import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { blogCategoryFixtures, blogPostFixture } from '@remoa/contracts/mocks';
import type { BlogPost } from '@remoa/contracts';
import { ToastProvider } from '@remoa/ui';
import { PostEditor } from './post-editor';

const blogAction = vi.fn();
const blogPatch = vi.fn().mockResolvedValue({ ok: true, auditId: 'a_1', data: {} });
vi.mock('../api', () => ({
  blogAction: (...a: unknown[]) => blogAction(...a) as unknown,
  blogPatch: (...a: unknown[]) => blogPatch(...a) as unknown,
  listBlogPosts: vi.fn().mockResolvedValue({ ok: true, data: { items: [] } }),
}));
vi.mock('./api', () => ({ listRevisions: vi.fn().mockResolvedValue({ ok: true, data: [] }) }));

const draft: BlogPost = {
  ...blogPostFixture,
  status: 'draft',
  publishedAt: null,
  cover: null,
  content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Só um parágrafo, sem subtítulo.' }] }] },
};

const mount = (post: BlogPost) =>
  render(
    <ToastProvider closeLabel="x" viewportLabel="y">
      <PostEditor post={post} categories={blogCategoryFixtures} me={{ id: '00000000-0000-4000-8000-000000000001', name: 'Admin' }} site="remoa.com.br" />
    </ToastProvider>,
  );

afterEach(cleanup);

describe('PostEditor', () => {
  it('blocks publishing without H2 and cover, listing what is missing', async () => {
    mount(draft);
    await screen.findByText('Só um parágrafo, sem subtítulo.');
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    const dialog = await screen.findByRole('dialog');
    const alert = within(dialog).getByRole('alert');
    expect(alert).toHaveTextContent('capa com texto alternativo');
    expect(alert).toHaveTextContent('pelo menos um H2');
    expect(within(dialog).getAllByRole('button', { name: 'Publicar' }).at(-1)).toBeDisabled();
    expect(blogAction).not.toHaveBeenCalled();
  });

  it('a published post offers "Atualizar"; publishing a ready draft calls the API and toasts the sitemap', async () => {
    const ready: BlogPost = { ...blogPostFixture, status: 'draft', publishedAt: null };
    blogAction.mockResolvedValueOnce({ ok: true, auditId: 'a_2', data: { post: { ...ready, status: 'published' } } });
    mount(ready);
    await screen.findByText('Como funciona');
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('alert')).toBeNull();
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Publicar' }).at(-1)!);
    await waitFor(() => expect(blogAction).toHaveBeenCalledWith(`/posts/${ready.id}/publish`));
    expect(await screen.findAllByText('Sitemap atualizado')).not.toHaveLength(0);
    expect(await screen.findByRole('button', { name: 'Atualizar' })).toBeInTheDocument();
  });

  it('the SEO checklist reacts to the title as it is typed', async () => {
    mount(draft);
    await screen.findByText('Só um parágrafo, sem subtítulo.');
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'SEO' }));
    const item = () => screen.getByText('Título entre 30 e 60 caracteres').closest('li')!;
    expect(item()).toHaveAttribute('data-state', 'ok'); // fixture title has 32 characters
    fireEvent.change(screen.getByLabelText('Título (H1)'), { target: { value: 'Título curto' } });
    expect(item()).toHaveAttribute('data-state', 'warn');
    fireEvent.change(screen.getByLabelText('Título (H1)'), { target: { value: 'Ok' } });
    expect(item()).toHaveAttribute('data-state', 'error');
  });

  it('offers only the allowed blocks (no H1, code, divider)', async () => {
    mount(draft);
    await screen.findByText('Só um parágrafo, sem subtítulo.');
    const trigger = screen.getByRole('button', { name: 'Adicionar bloco' });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
    const items = (await screen.findAllByRole('menuitem')).map((m) => m.textContent);
    expect(items).toEqual(['Parágrafo', 'H2 (subtítulo)', 'H3 (subseção)', 'H4 (opcional)', 'Lista', 'Lista numerada', 'Citação', 'Destaque', 'Imagem', 'Botão', 'FAQ']);
  });
});
