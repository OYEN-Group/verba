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
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Research Library', href: '/library', icon: BookOpen },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col flex-1 h-full bg-[#0B121F] text-slate-300">
      <div className="py-4 px-4">
        <button 
          onClick={() => setIsNewWorkModalOpen(true)}
          className="flex items-center justify-center w-full h-[40px] bg-[#C29B62] text-white font-medium rounded-md hover:bg-[#C29B62]/90 transition-colors shadow-sm mx-auto"
          title="New document"
        >
          <Plus size={16} className="mr-2" />
          <span className="text-[14px]">New document</span>
        </button>
      </div>
      
      <div className="space-y-2 mt-6 px-4">
        {primaryNav.map((item) => {
          const isActive = pathname === item.href || (item.name === 'Home' && pathname === '/workspace');
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              prefetch={'prefetch' in item ? (item as any).prefetch : undefined}
              className={`flex items-center space-x-4 w-full h-[40px] px-3 transition-colors rounded-lg relative ${
                isActive 
                  ? 'text-white font-bold' 
                  : 'text-white/90 hover:text-white hover:bg-white/5 font-bold'
              }`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-white/80'} />
              <span className="text-[15px]">{item.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col w-full px-4 pb-6 relative">
        {/* Professional Card */}
        <div className="bg-[#121A2A] border border-white/5 rounded-xl p-4 mb-6">
          <p className="text-[#C29B62] text-[11px] font-bold tracking-wider mb-2">PROFESSIONAL</p>
          <p className="text-[#8CA4CA] text-[13px] leading-snug mb-3 font-medium">
            More AI usage, deeper review and advanced research tools.
          </p>
          <Link href="/professional" className="flex items-center text-white text-[13px] font-bold hover:underline">
            Explore Professional
            <ArrowRight size={14} className="ml-1.5" />
          </Link>
        </div>

        <button 
          ref={triggerRef}
          onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
          className="flex items-center space-x-3 w-full rounded-xl hover:bg-white/5 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full bg-[#F1E5D1] flex items-center justify-center text-[#0B1628] shrink-0">
            <span className="text-[15px] font-bold leading-none">
              {getInitials(userName)}
            </span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[15px] font-bold text-white truncate">{userName}</span>
            <span className="text-[12px] text-[#8CA4CA] truncate mt-0.5">Free Plan</span>
          </div>
          <MoreHorizontal size={18} className="text-[#8CA4CA] shrink-0" />
        </button>

        
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
