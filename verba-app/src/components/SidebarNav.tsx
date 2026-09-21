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

export function SidebarNav({ userName = 'Writer', userEmail = '', isCollapsed = false }: SidebarNavProps) {
  const pathname = usePathname();
  const [isNewWorkModalOpen, setIsNewWorkModalOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Mock plan data for Phase A
  const mockPlan = 'free'; // 'free' or 'professional'

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

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };
  const primaryNav = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Works', href: '/documents', icon: FileText },
    { name: 'Research', href: '/library', icon: BookOpen },
  ];
  


  return (
    <div className="flex flex-col flex-1 h-full bg-navy text-slate-300">
      <div className={`py-6 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        <button 
          onClick={() => setIsNewWorkModalOpen(true)}
          className={`flex items-center justify-center h-[40px] bg-gold text-white font-medium rounded-md hover:bg-gold-hover transition-colors text-[14px] shadow-sm ${isCollapsed ? 'w-[44px] mx-auto' : 'w-full'}`}
          title={isCollapsed ? "New document" : undefined}
        >
          <Plus size={16} className={isCollapsed ? '' : 'mr-2'} />
          {!isCollapsed && "New document"}
        </button>
      </div>
      
      <div className={`space-y-2 mt-2 ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {primaryNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              prefetch={'prefetch' in item ? (item as any).prefetch : undefined}
              className={`flex items-center h-[44px] text-[15px] font-bold transition-colors rounded-xl ${isCollapsed ? 'justify-center w-[44px] mx-auto px-0' : 'px-4 py-3'} ${
                isActive 
                  ? 'bg-navy-active text-white' 
                  : 'text-slate-200 hover:text-white hover:bg-navy-hover'
              }`}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon size={20} className={`shrink-0 ${isActive ? 'text-gold' : 'text-slate-400'} ${isCollapsed ? '' : 'mr-4'}`} />
              {!isCollapsed && item.name}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col w-full px-4 pb-4">
        {/* Workspace Switcher */}
        {!isCollapsed && (
          <div className="mb-4">
            <span className="text-[11px] text-slate-400 mb-1 block">Workspace</span>
            <button className="flex items-center justify-between w-full p-2 bg-[#1A202A] rounded-md hover:bg-[#202732] transition-colors group text-left">
              <div className="flex items-center">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center shrink-0 mr-2">
                  <User size={12} className="text-[#161B22]" />
                </div>
                <span className="text-[13px] font-semibold text-white">Personal</span>
              </div>
              <ChevronDown size={14} className="text-slate-400 group-hover:text-white" />
            </button>
          </div>
        )}

        {/* Promo Banner */}
        {!isCollapsed && (
          <div className="relative rounded-lg overflow-hidden h-[120px] bg-gradient-to-br from-[#1E2530] to-[#12161D] border border-slate-800 p-4 flex flex-col justify-end">
            <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1454496522488-7a8e488e8606?q=80&w=2076&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay"></div>
            <div className="relative z-10">
              <h4 className="text-white font-bold text-[15px] leading-tight mb-1">Better writing<br/>brighter futures.</h4>
              <p className="text-[10px] text-slate-300">Research. Write. Cite. Prove.</p>
            </div>
          </div>
        )}

        {/* Version Footer */}
        {!isCollapsed && (
          <div className="mt-4 text-[10px] text-slate-500">
            Verba v0.1.0
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
