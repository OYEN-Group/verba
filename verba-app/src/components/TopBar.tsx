'use client';

import React from 'react';
import { Search, Bell } from 'lucide-react';

interface TopBarProps {
  userName: string;
}

export function TopBar({ userName }: TopBarProps) {
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <header className="h-[60px] bg-white border-b border-border-light flex items-center justify-between px-6 shrink-0 z-20">
      <div className="flex-1 max-w-[600px]">
        <div className="relative group">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted group-focus-within:text-accent transition-colors" />
          <input 
            type="text" 
            placeholder="Search your documents, sources, or ask Verba..." 
            className="w-full h-9 pl-9 pr-14 bg-background-secondary border border-transparent focus:border-accent/30 focus:bg-white rounded-md text-[13px] outline-none transition-all placeholder:text-foreground-muted/70"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-border-light bg-white text-[10px] text-foreground-muted font-medium shadow-sm">Ctrl</kbd>
            <kbd className="px-1.5 py-0.5 rounded border border-border-light bg-white text-[10px] text-foreground-muted font-medium shadow-sm">K</kbd>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-5 ml-4">
        <button className="relative text-foreground-secondary hover:text-foreground transition-colors">
          <Bell size={18} />
          <span className="absolute 1 top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        
        <div className="flex items-center space-x-2.5 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-slate-500 flex items-center justify-center shrink-0">
            <span className="text-white font-medium text-[13px]">{getInitials(userName)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-foreground group-hover:text-accent transition-colors leading-tight">{userName}</span>
            <span className="text-[11px] text-foreground-secondary leading-tight">Student Plan</span>
          </div>
        </div>
      </div>
    </header>
  );
}
