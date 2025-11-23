'use client';

import Link from 'next/link';

interface HeaderProps {
  currentPage?: string;
  showAuth?: boolean;
  userName?: string;
  userAvatar?: string;
}

export default function Header({ currentPage, showAuth, userName, userAvatar }: HeaderProps) {
  return (
    <header className="bg-white/90 backdrop-blur-lg border-b border-neutral-200 px-2 md:px-3 py-2">
      <div className="flex items-center justify-center md:justify-start">
        <Link href="/" className="flex items-center space-x-2">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Thoughtworks_logo.png/1200px-Thoughtworks_logo.png"
            alt="Thoughtworks"
            className="h-6"
          />
          <span className="text-neutral-300">|</span>
          <span className="text-base font-semibold">LitRealms</span>
        </Link>
      </div>
    </header>
  );
}
