import React from 'react';
import Link from 'next/link';
import { SidebarNav } from '@/components/SidebarNav';
import { Playfair_Display } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`flex h-screen bg-[#F6F8FB] ${playfair.variable}`}>
      {/* Sidebar */}
      <aside className="w-[240px] bg-navy border-r border-navy flex-col hidden md:flex shrink-0">
        <div className="h-[64px] flex items-center px-6 shrink-0 mt-2 mb-2">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gold">
              <path d="M4.5 4.5L10 20H14L19.5 4.5H16.5L12 16.5L7.5 4.5H4.5Z" fill="currentColor"/>
              <path d="M12 4.5L14 10.5H10L12 4.5Z" fill="white" opacity="0.3"/>
            </svg>
            <div className="flex flex-col ml-1">
              <span className="text-white font-bold tracking-widest text-[14px] leading-none">VERBA</span>
              <span className="text-white/50 text-[9px] tracking-wide mt-0.5 whitespace-nowrap">Write with evidence.</span>
            </div>
          </Link>
        </div>
        
        <SidebarNav />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile only) */}
        <header className="h-[64px] bg-navy flex items-center justify-between px-4 md:hidden shrink-0">
          <Link href="/dashboard" className="flex items-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gold">
              <path d="M4.5 4.5L10 20H14L19.5 4.5H16.5L12 16.5L7.5 4.5H4.5Z" fill="currentColor"/>
            </svg>
            <span className="text-white font-bold tracking-widest text-[14px] ml-2">VERBA</span>
          </Link>
          <button className="p-2 text-white/70 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
