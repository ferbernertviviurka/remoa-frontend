import { notFound } from 'next/navigation';
import { t } from '@remoa/strings';
import { AdminHeader, ToastProvider } from '@remoa/ui';
import { requireAdmin } from '@/features/admin/shared/api';
import { getBlogPost, getCategories } from '@/features/admin/blog/api';
import { PostEditor } from '@/features/admin/blog/editor/post-editor';
import { siteUrl } from '@/lib/seo/site';

// F27 T7: /admin/blog/[id], the post editor (FR-5 to FR-11). Non-admin = 404 (rule 9; the layout checks too).
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  const [post, categories] = await Promise.all([getBlogPost(id), getCategories()]);
  if (!post.ok) {
    if (post.error.code === 'not_found' || post.error.code === 'validation') notFound();
    return <AdminHeader title={t('adminBlog.editor.title')} subtitle={t('adminBlog.editor.ui.loadError')} />;
  }
  return (
    <ToastProvider closeLabel={t('adminBlog.editor.ui.toastClose')} viewportLabel={t('adminBlog.editor.ui.toastViewport')}>
      <PostEditor post={post.data} categories={categories.ok ? categories.data : []} me={{ id: me.id, name: me.name ?? me.email }} site={new URL(siteUrl).host} />
    </ToastProvider>
  );
}
