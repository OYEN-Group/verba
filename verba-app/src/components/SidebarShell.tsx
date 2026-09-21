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
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="flex items-center space-x-3 mb-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <path d="M11.9998 19L5.99976 7H8.59976L11.9998 15.1L15.3998 7H17.9998L11.9998 19Z" fill="#C59E60"/>
              <path d="M12.0002 19L18.0002 7H15.4002L12.0002 15.1L8.60024 7H6.00024L12.0002 19Z" fill="url(#paint0_linear)"/>
              <defs>
                <linearGradient id="paint0_linear" x1="12.0002" y1="7" x2="12.0002" y2="19" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#C59E60"/>
                  <stop offset="1" stopColor="#A07D45"/>
                </linearGradient>
              </defs>
            </svg>
            <div className="flex flex-col">
              <span className="text-white font-bold text-lg leading-tight tracking-wide">VERBA</span>
              <span className="text-[#8CA4CA] text-[10px] leading-tight">Write with evidence.</span>
            </div>
          </div>
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <SidebarNav userName={userName} userEmail={userEmail} isCollapsed={false} />
      </div>
    </aside>
  );
}
