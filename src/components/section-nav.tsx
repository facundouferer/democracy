'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Diputados' },
  { href: '/senado', label: 'Senadores' },
];

export default function SectionNav() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  return (
    <>
      <header className="site-nav">
        <nav>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? 'active' : undefined}
                onClick={() => {
                  if (!isActive) {
                    setIsNavigating(true);
                  }
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {isNavigating ? (
        <div className="page-preloader" role="status" aria-live="polite" aria-label="Cargando">
          <div className="preloader-inner">
            <Image src="/img/logo.svg" alt="Cargando" width={120} height={120} />
            <div className="preloader-orbit" aria-hidden="true">
              <span />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
