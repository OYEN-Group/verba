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
      
      <div className="space-y-3 mt-4 px-2">
        {primaryNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              prefetch={'prefetch' in item ? (item as any).prefetch : undefined}
              className={`flex items-center justify-center w-[40px] h-[40px] transition-colors rounded-xl mx-auto ${
                isActive 
                  ? 'bg-navy-active text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-navy-hover'
              }`}
              title={item.name}
            >
              <item.icon size={20} className={isActive ? 'text-gold' : ''} />
            </Link>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col items-center w-full pb-6 relative">
        <button 
          ref={triggerRef}
          onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
          className="w-[36px] h-[36px] rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          title="Account settings"
        >
          <span className="text-[14px] font-medium leading-none">
            {getInitials(userName)}
          </span>
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
