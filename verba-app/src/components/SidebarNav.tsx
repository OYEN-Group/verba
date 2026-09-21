'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Settings, Plus, User, LogOut, BookOpen, HelpCircle, MoreHorizontal, ArrowRight, ArrowUpRight, PenTool, Shield, AlertTriangle, Share, ChevronDown, Folder, Users } from 'lucide-react';
import { logout } from '@/app/(auth)/actions';
import { NewWorkModal } from '@/components/NewWorkModal';

interface SidebarNavProps {
  userName?: string;
  userEmail?: string;
  isCollapsed?: boolean;
}

export function SidebarNav({ userName = 'Writer', userEmail = '' }: SidebarNavProps) {
  const pathname = usePathname();
  const [isNewWorkModalOpen, setIsNewWorkModalOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    }
    function handleEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const getInitials = (name: string) => name.charAt(0).toUpperCase();

  const primaryNav = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Works', href: '/documents', icon: FileText },
    { name: 'Research', href: '/library', icon: BookOpen },
    { name: 'Sources', href: '/sources', icon: Folder },
    { name: 'Prove', href: '/prove', icon: Shield },
  ];

  return (
    <div className="flex flex-col flex-1 h-full bg-[#0B121F] text-slate-300">
      <div className="py-4 px-2">
        <button 
          onClick={() => setIsNewWorkModalOpen(true)}
          className="flex items-center justify-center w-[40px] h-[40px] bg-gold text-white font-medium rounded-xl hover:bg-gold-hover transition-colors shadow-sm mx-auto"
          title="New document"
        >
          <Plus size={18} />
        </button>
      </div>
      
      <div className="space-y-1 mt-6 px-4">
        {primaryNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              prefetch={'prefetch' in item ? (item as any).prefetch : undefined}
              className={`flex items-center space-x-3 w-full h-[40px] px-3 transition-colors rounded-lg relative ${
                isActive 
                  ? 'bg-white/10 text-white font-medium' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#C59E60] rounded-r-md" />}
              <item.icon size={18} className={isActive ? 'text-[#C59E60]' : 'text-slate-400'} />
              <span className="text-[13px]">{item.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 px-4">
        <h4 className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Prove</h4>
        <div className="space-y-1">
          <Link href="/prove/history" className="flex items-center space-x-3 w-full h-[36px] px-3 transition-colors rounded-lg text-slate-400 hover:text-white hover:bg-white/5">
            <span className="text-[13px] pl-7">History</span>
          </Link>
          <Link href="/prove/development" className="flex items-center space-x-3 w-full h-[36px] px-3 transition-colors rounded-lg text-slate-400 hover:text-white hover:bg-white/5">
            <span className="text-[13px] pl-7">Development</span>
          </Link>
        </div>
      </div>

      <div className="mt-auto flex flex-col w-full px-4 pb-6 relative">
        <button 
          ref={triggerRef}
          onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
          className="flex items-center space-x-3 w-full p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-full bg-[#8CA4CA] flex items-center justify-center text-[#0B1628] shrink-0">
            <span className="text-[13px] font-bold leading-none">
              {getInitials(userName)}
            </span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[13px] font-medium text-white truncate">{userName}</span>
            <span className="text-[11px] text-slate-400 truncate">Student Plan</span>
          </div>
        </button>
        
        <div className="flex flex-col space-y-1 mt-2">
          <Link href="/settings" className="flex items-center space-x-3 px-3 h-[36px] rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <Settings size={16} />
            <span className="text-[13px]">Settings</span>
          </Link>
          <Link href="/help" className="flex items-center space-x-3 px-3 h-[36px] rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <HelpCircle size={16} />
            <span className="text-[13px]">Help & Resources</span>
          </Link>
        </div>

        
        {isAccountMenuOpen && (
          <div 
            ref={menuRef}
            className="absolute bottom-full left-14 mb-2 w-56 bg-[#161B22] border border-border-light rounded-lg shadow-xl overflow-hidden z-50"
          >
            <div className="p-4 border-b border-border-light bg-[#1E2530]">
              <p className="text-white text-sm font-medium truncate">{userName}</p>
              <p className="text-slate-400 text-xs truncate mt-0.5">{userEmail}</p>
            </div>
            <div className="p-2">
              <Link href="/settings" className="flex items-center px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-navy-hover rounded-md transition-colors" onClick={() => setIsAccountMenuOpen(false)}>
                <Settings size={16} className="mr-2" />
                Settings
              </Link>
              <button 
                onClick={async () => {
                  setIsAccountMenuOpen(false);
                  await logout();
                }}
                className="flex items-center w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors text-left"
              >
                <LogOut size={16} className="mr-2" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      <NewWorkModal 
        isOpen={isNewWorkModalOpen} 
        onClose={() => setIsNewWorkModalOpen(false)} 
        onUploadSelect={() => {
          window.location.href = '/dashboard';
        }}
      />
    </div>
  );
}
