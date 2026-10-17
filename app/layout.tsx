import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Glera · Formularios de planes',
  description: 'Crea formularios para los planes de fin de semana de Glera y compártelos por WhatsApp.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
