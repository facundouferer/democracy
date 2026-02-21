import type { Metadata } from 'next';
import Image from 'next/image';

import SileoProvider from '@/components/SileoProvider';

import './globals.css';

export const metadata: Metadata = {
  title: 'Diputados Nacionales',
  description: 'Listado de diputados nacionales sincronizado desde diputados.gov.ar',
  icons: {
    icon: '/img/logo.svg',
    shortcut: '/img/logo.svg',
    apple: '/img/logo.svg',
  },
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
        <footer className="site-footer">
          <div className="site-footer-inner">
            <div className="site-footer-icons" aria-hidden="true">
              <Image src="/img/escudo.svg" alt="" width={52} height={52} />
              <Image src="/img/logo.svg" alt="" width={52} height={52} />
              <Image src="/img/escudo.svg" alt="" width={52} height={52} />
            </div>
            <p className="site-footer-title">¿A quien sirven los elegidos por el pueblo?</p>
            <p className="site-footer-copy">
              2025 - ©{' '}
              <a href="https://www.facundouferer.ar/" target="_blank" rel="noopener noreferrer">
                Facundo Uferer
              </a>
            </p>
          </div>
        </footer>
        <SileoProvider />
      </body>
    </html>
  );
}
