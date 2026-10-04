import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Remoa',
    short_name: 'Remoa',
    description: 'Mapa de estudo com revisão espaçada para medicina',
    start_url: '/revisar',
    display: 'standalone',
    background_color: '#f6f5fb',
    theme_color: '#6D5BD0',
    lang: 'pt-BR',
    scope: '/',
    icons: [
      { src: '/icon-192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
