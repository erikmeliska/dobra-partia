export default function manifest() {
  return {
    name: 'Dobrá Partia',
    short_name: 'Partia',
    description: 'Operačná appka Dobrej Partie',
    start_url: '/dopyty',
    display: 'standalone',
    background_color: '#f9f7f2',
    theme_color: '#1e3a5f',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }
}
