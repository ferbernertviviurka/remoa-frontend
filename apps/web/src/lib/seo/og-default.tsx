import { ImageResponse } from 'next/og';
import { Logo } from '@remoa/ui';
import { t } from '@remoa/strings/full';
import { siteUrl } from './site';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_DEFAULT_PATH = '/og-default';

/** Metadata `images` entry for pages that define their own openGraph (that drops the file-convention image, whose URL is hashed). */
export const defaultOgImageMeta = () => ({ url: `${siteUrl}${OG_DEFAULT_PATH}`, ...OG_SIZE, alt: t('landing.seo.ogTitle') });

// Static, no external fetch: system sans only. Colors from DESIGN.md (--panel-dark, --primary tint, --on-dark-muted).
export function defaultOgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#241A5C', color: '#FFFFFF', fontFamily: 'sans-serif' }}>
        {/* Logo horizontal sobre #241A5C: paleta clara do app-icon + wordmark branco (D-354). Chamado como funcao (sem hooks) porque o satori so aceita elementos nativos. */}
        {Logo({ withWordmark: true, onDark: true, size: 76 })}
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.1, marginTop: 32 }}>{t('landing.seo.ogTitle')}</div>
        <div style={{ fontSize: 34, marginTop: 32, color: '#DDD7FA' }}>{t('landing.seo.ogDescription')}</div>
      </div>
    ),
    OG_SIZE,
  );
}
