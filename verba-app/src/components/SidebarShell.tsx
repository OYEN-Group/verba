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
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside 
      className={`bg-[#141C2B] border-r border-[#141C2B] flex-col hidden md:flex shrink-0 transition-all duration-300 relative ${
        isCollapsed ? 'w-[64px]' : 'w-[260px]'
      }`}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-white border border-border-light rounded-full p-1 text-foreground-secondary hover:text-foreground shadow-sm z-50 transition-transform"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
      </button>

      <div className={`h-[80px] flex items-center shrink-0 mt-2 mb-2 ${isCollapsed ? 'justify-center px-0' : 'px-7'}`}>
        <Link href="/dashboard" className="flex items-center space-x-3 overflow-hidden">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gold shrink-0">
            <path d="M4.5 4.5L10 20H14L19.5 4.5H16.5L12 16.5L7.5 4.5H4.5Z" fill="currentColor"/>
            <path d="M12 4.5L14 10.5H10L12 4.5Z" fill="#9C7646"/>
          </svg>
          {!isCollapsed && (
            <div className="flex flex-col ml-1 shrink-0">
              <span className="text-white font-extrabold tracking-widest text-[16px] leading-none mb-1">VERBA</span>
              <span className="text-slate-400 text-[10px] tracking-wide mt-0.5 whitespace-nowrap font-medium">Write with evidence.</span>
            </div>
          )}
        </Link>
      </div>
      
      <div className={`flex-1 overflow-y-auto overflow-x-hidden ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        <SidebarNav userName={userName} userEmail={userEmail} isCollapsed={isCollapsed} />
      </div>
    </aside>
  );
}
