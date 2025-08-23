'use client';

import Link from 'next/link';

interface EnlaceMenuProps {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export default function EnlaceMenu({ href, isActive, children, onClick }: EnlaceMenuProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`px-4 py-2 retro-button text-sm transition-all duration-300 ${isActive
          ? 'bg-green-400/20 text-green-300 neon-glow'
          : 'text-green-400 hover:bg-green-400/10'
        }`}
    >
      <span className="flex items-center justify-center">
        {children}
      </span>
    </Link>
  );
}
