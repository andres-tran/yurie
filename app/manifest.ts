import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Yurie',
    short_name: 'Yurie',
    description: 'Yurie',
    start_url: '/',
    display: 'standalone',
    // Use dark background to avoid white flash on splash screen when A2HS
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: '/favicon.ico?v=3',
        sizes: 'any',
        type: 'image/x-icon',
        purpose: 'any',
      },
    ],
  }
}


