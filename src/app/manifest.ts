import type { MetadataRoute } from 'next';

/** Makes "Add to Home Screen" produce something that behaves like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Our Pace',
    short_name: 'Our Pace',
    description: 'Training, plans and small competitions, for the two of us.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#d64f17',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
