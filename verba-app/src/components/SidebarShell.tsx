'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SidebarNav } from '@/components/SidebarNav';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarShellProps {
  userName: string;
  userEmail: string;
}

export function SidebarShell({ userName, userEmail }: SidebarShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside 
      className={`bg-[#0B121F] border-r border-[#0B121F] flex-col hidden md:flex shrink-0 relative z-20 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[56px]' : 'w-[212px]'
      }`}
    >
      {/* Collapse Control */}
      {!isCollapsed && (
        <button 
          onClick={() => setIsCollapsed(true)}
          className="absolute right-3 top-4 w-[28px] h-[28px] rounded border border-white/5 bg-transparent flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors z-30"
          title="Collapse sidebar"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {/* Header Area */}
      <div className={`pt-[20px] pb-[16px] flex flex-col shrink-0 ${isCollapsed ? 'items-center px-0' : 'px-4'}`}>
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity overflow-hidden">
          <div className="flex items-center space-x-3 mb-1">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#C59E60] shrink-0">
              <path d="M4.5 4.5L10 20H14L19.5 4.5H16.5L12 16.5L7.5 4.5H4.5Z" fill="currentColor"/>
              <path d="M12 4.5L14 10.5H10L12 4.5Z" fill="#A07D45"/>
            </svg>
            {!isCollapsed && (
              <div className="flex flex-col whitespace-nowrap">
                <span className="text-white font-semibold text-[16px] leading-none tracking-wide mt-1">VERBA</span>
                <span className="text-[#8CA4CA] text-[10px] font-medium leading-tight mt-1">Write. Research. Prove.</span>
              </div>
            )}
          </div>
        </Link>
      </div>

      {isCollapsed && (
        <div className="w-full flex justify-center mb-4">
          <button 
            onClick={() => setIsCollapsed(false)}
            className="w-[28px] h-[28px] rounded border border-white/5 bg-transparent flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar flex flex-col">
        <SidebarNav userName={userName} userEmail={userEmail} isCollapsed={isCollapsed} />
      </div>
    </aside>
  );
}
