import type { Metadata } from 'next';

import SileoProvider from '@/components/SileoProvider';

import './globals.css';

export const metadata: Metadata = {
  title: 'Diputados Nacionales',
  description: 'Listado de diputados nacionales sincronizado desde diputados.gov.ar',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}
        <SileoProvider />
      </body>
    </html>
  );
}
