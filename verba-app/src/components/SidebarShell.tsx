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
        isCollapsed ? 'w-[80px]' : 'w-[280px]'
      }`}
    >
      {/* Header Area */}
      <div className={`h-[72px] flex items-center shrink-0 mt-2 mb-2 ${isCollapsed ? 'justify-center px-0' : 'justify-between px-6'}`}>
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity overflow-hidden">
          <div className="flex items-center space-x-3 mb-1">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#C59E60] shrink-0">
              <path d="M4.5 4.5L10 20H14L19.5 4.5H16.5L12 16.5L7.5 4.5H4.5Z" fill="currentColor"/>
              <path d="M12 4.5L14 10.5H10L12 4.5Z" fill="#A07D45"/>
            </svg>
            {!isCollapsed && (
              <div className="flex flex-col whitespace-nowrap">
                <span className="text-white font-medium text-[20px] leading-none tracking-[0.2em] mt-1">V E R B A</span>
                <span className="text-[#8CA4CA] text-[10px] font-medium leading-tight mt-1.5">Write. Research. Prove.</span>
              </div>
            )}
          </div>
        </Link>
        
        {!isCollapsed && (
          <button 
            onClick={() => setIsCollapsed(true)}
            className="w-7 h-7 rounded bg-[#161F30] border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-[#1E293B] transition-colors shrink-0"
            title="Collapse Sidebar"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {isCollapsed && (
        <div className="w-full flex justify-center mb-4">
          <button 
            onClick={() => setIsCollapsed(false)}
            className="w-7 h-7 rounded bg-[#161F30] border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-[#1E293B] transition-colors"
            title="Expand Sidebar"
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        <SidebarNav userName={userName} userEmail={userEmail} isCollapsed={isCollapsed} />
      </div>
    </aside>
  );
}
