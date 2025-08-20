'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="bg-black/90 backdrop-blur-md border-b-2 border-green-400 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center space-x-2 text-green-400 hover:text-green-300 transition-colors"
          >
            <div className="w-8 h-8 border-2 border-green-400 flex items-center justify-center">
              <span className="text-sm font-bold font-mono">H</span>
            </div>
            <span className="font-orbitron font-bold text-lg neon-text">
              HCDN.SYS
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex space-x-1">
            <Link
              href="/"
              className={`px-4 py-2 retro-button text-sm transition-all duration-300 ${isActive('/')
                  ? 'bg-green-400/20 text-green-300 neon-glow'
                  : 'text-green-400 hover:bg-green-400/10'
                }`}
            >
              <span className="flex items-center space-x-2">
                <span>[</span>
                <span>INICIO</span>
                <span>]</span>
              </span>
            </Link>

            <Link
              href="/ranking"
              className={`px-4 py-2 retro-button text-sm transition-all duration-300 ${isActive('/ranking')
                  ? 'bg-green-400/20 text-green-300 neon-glow'
                  : 'text-green-400 hover:bg-green-400/10'
                }`}
            >
              <span className="flex items-center space-x-2">
                <span>[</span>
                <span>RANKING</span>
                <span>]</span>
              </span>
            </Link>
          </div>

          {/* Status indicator */}
          <div className="flex items-center space-x-2 text-green-400 text-xs font-mono">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>ONLINE</span>
          </div>
        </div>

        {/* Terminal line effect */}
        <div className="h-px bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-50"></div>
      </div>
    </nav>
  );
}
