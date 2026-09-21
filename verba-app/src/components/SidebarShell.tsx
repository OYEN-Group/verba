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
      className="bg-[#0B121F] border-r border-[#0B121F] flex-col hidden md:flex shrink-0 w-[64px] relative z-20"
    >
      <div className="h-[72px] flex items-center justify-center shrink-0 mt-2 mb-2">
        <Link href="/dashboard" className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-[#1A2333] transition-colors" title="Verba Home">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gold">
            <path d="M4.5 4.5L10 20H14L19.5 4.5H16.5L12 16.5L7.5 4.5H4.5Z" fill="currentColor"/>
            <path d="M12 4.5L14 10.5H10L12 4.5Z" fill="#9C7646"/>
          </svg>
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden sidebar-collapsed">
        <SidebarNav userName={userName} userEmail={userEmail} isCollapsed={true} />
      </div>
    </aside>
  );
}
