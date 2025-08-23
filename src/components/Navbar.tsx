'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import EnlaceMenu from './EnlaceMenu';

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return pathname === path;
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const menuItems = [
    { href: '/', label: 'INICIO' },
    { href: '/ranking', label: 'RANKING' },
    { href: '/estadisticas', label: 'ESTADÍSTICAS' }
  ];

  return (
    <nav className="bg-black/90 backdrop-blur-md border-b-2 border-green-400 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center space-x-2 text-green-400 hover:text-green-300 transition-colors"
            onClick={closeMenu}
          >
            <div className="w-8 h-8 border-2 border-green-400 flex items-center justify-center">
              <span className="text-sm font-bold font-mono">H</span>
            </div>
            <span className="font-orbitron font-bold text-lg neon-text">
              HCDN.SYS
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex space-x-1">
            {menuItems.map((item) => (
              <EnlaceMenu
                key={item.href}
                href={item.href}
                isActive={isActive(item.href)}
              >
                {item.label}
              </EnlaceMenu>
            ))}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={toggleMenu}
            className="md:hidden px-3 py-2 text-green-400 hover:text-green-300 transition-colors focus:outline-none"
            aria-label="Toggle menu"
          >
            <div className="w-6 h-6 flex flex-col justify-center items-center">
              <span className={`block h-0.5 w-6 bg-current transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1' : '-translate-y-1'
                }`}></span>
              <span className={`block h-0.5 w-6 bg-current transition-all duration-300 ${isMenuOpen ? 'opacity-0' : 'opacity-100'
                }`}></span>
              <span className={`block h-0.5 w-6 bg-current transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1' : 'translate-y-1'
                }`}></span>
            </div>
          </button>

          {/* Desktop Status indicator */}
          <div className="hidden md:flex items-center space-x-2 text-green-400 text-xs font-mono">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>ONLINE</span>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}>
          <div className="py-4 space-y-2 border-t border-green-400/30">
            {menuItems.map((item) => (
              <div key={item.href} className="block">
                <EnlaceMenu
                  href={item.href}
                  isActive={isActive(item.href)}
                  onClick={closeMenu}
                >
                  {item.label}
                </EnlaceMenu>
              </div>
            ))}

            {/* Mobile Status indicator */}
            <div className="flex items-center justify-center space-x-2 text-green-400 text-xs font-mono pt-4">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>ONLINE</span>
            </div>
          </div>
        </div>

        {/* Terminal line effect */}
        <div className="h-px bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-50"></div>
      </div>
    </nav>
  );
}
