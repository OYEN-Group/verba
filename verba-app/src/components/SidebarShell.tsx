'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SidebarNav } from '@/components/SidebarNav';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface SidebarShellProps {
  userName: string;
  userEmail: string;
}

export function SidebarShell({ userName, userEmail }: SidebarShellProps) {
  return (
    <aside 
      className="bg-[#0B1628] border-r border-[#0B1628] flex-col hidden md:flex shrink-0 w-[220px] relative z-20"
    >
      <div className="h-[72px] flex items-center px-6 shrink-0 mt-2 mb-2">
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity" title="Verba Home">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#F1D19C]">
            <path d="M4.5 4.5L10 20H14L19.5 4.5H16.5L12 16.5L7.5 4.5H4.5Z" fill="currentColor"/>
            <path d="M12 4.5L14 10.5H10L12 4.5Z" fill="#C59E60"/>
          </svg>
          <div className="flex flex-col">
            <span className="text-white text-xl font-medium tracking-wide leading-none">Verba</span>
            <span className="text-white/60 text-[10px] mt-1 tracking-widest">Write with confidence</span>
          </div>
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <SidebarNav userName={userName} userEmail={userEmail} isCollapsed={false} />
      </div>
    </aside>
  );
}
