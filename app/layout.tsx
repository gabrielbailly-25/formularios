import './globals.css';
import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL; // p. ej. https://formularios.vercel.app — necesaria para que la vista previa salga en redes sociales

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: 'Glera · Formularios de planes',
  description: 'Crea formularios para los planes de fin de semana de Glera y compártelos por WhatsApp.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon-512.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Formularios',
    statusBarStyle: 'default',
  },
  openGraph: {
    title: 'Glera · Formularios de planes',
    description: 'Apúntate a los planes de fin de semana de Asociación Juvenil Glera.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Glera · Formularios' }],
    type: 'website',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Glera · Formularios de planes',
    description: 'Apúntate a los planes de fin de semana de Asociación Juvenil Glera.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
