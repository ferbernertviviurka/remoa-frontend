import type { MetadataRoute } from 'next';
import { t } from '@remoa/strings';

// theme_color/background_color = #241A5C (fundo do app-icon, D-353): a barra do sistema e o splash combinam com o ícone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: t('common.appName'),
    short_name: t('common.appName'),
    start_url: '/app/hoje',
    display: 'standalone',
    theme_color: '#241A5C',
    background_color: '#241A5C',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
