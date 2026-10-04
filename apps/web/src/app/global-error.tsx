'use client';

import { t } from '@remoa/strings/landing';

// Replaces the root layout, so no tokens/providers: plain markup with inline style.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <div role="alert">
          <h1>{t('boundary.title')}</h1>
          <p>{t('boundary.body')}</p>
          {error.digest ? <p>{t('boundary.ref', { id: error.digest })}</p> : null}
          <button type="button" onClick={reset} style={{ minHeight: 44, padding: '0 16px' }}>
            {t('boundary.retry')}
          </button>
        </div>
      </body>
    </html>
  );
}
