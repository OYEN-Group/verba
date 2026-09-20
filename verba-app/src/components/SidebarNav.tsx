'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Settings, Plus, User, LogOut, BookOpen, HelpCircle, MoreHorizontal, ArrowRight, ArrowUpRight } from 'lucide-react';
import { logout } from '@/app/(auth)/actions';
import { NewWorkModal } from '@/components/NewWorkModal';

interface SidebarNavProps {
  userName?: string;
  userEmail?: string;
}

export function SidebarNav({ userName = 'Writer', userEmail = '' }: SidebarNavProps) {
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
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Research Library', href: '/library', icon: BookOpen },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];
  


  return (
    <div className="flex flex-col flex-1 h-full bg-navy text-slate-300">
      <div className="px-4 py-6">
        <button 
          onClick={() => setIsNewWorkModalOpen(true)}
          className="flex items-center justify-center w-full h-[40px] bg-gold text-white font-medium rounded-md hover:bg-gold-hover transition-colors text-[14px] shadow-sm"
        >
          <Plus size={16} className="mr-2" />
          New document
        </button>
      </div>
      
      <div className="px-3 space-y-2 mt-2">
        {primaryNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              className={`flex items-center px-4 py-3 h-[44px] text-[15px] font-bold transition-colors rounded-xl ${
                isActive 
                  ? 'bg-navy-active text-white' 
                  : 'text-slate-200 hover:text-white hover:bg-navy-hover'
              }`}
            >
              <item.icon size={20} className={`mr-4 shrink-0 ${isActive ? 'text-gold' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col w-full relative">
        {/* Promotional Block for Free Users */}
        {mockPlan === 'free' && (
          <div className="px-4 mb-3">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
              <div className="text-[11px] font-bold tracking-widest text-gold uppercase mb-2">PROFESSIONAL</div>
              <p className="text-[13px] text-slate-300 mb-4 leading-snug">
                More AI usage, deeper review and advanced research tools.
              </p>
              <Link href="/account" className="flex items-center w-max text-[13px] font-semibold text-white hover:text-gold transition-colors">
                Explore Professional <ArrowRight size={14} className="ml-1.5" />
              </Link>
            </div>
          </div>
        )}

        <div className="px-3 py-3 border-t border-slate-800/50">
          <button 
            ref={triggerRef}
            onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
            className="flex items-center w-full p-2 rounded-xl hover:bg-slate-800/60 transition-colors text-left group focus:outline-none focus:ring-2 focus:ring-gold/50"
            aria-haspopup="menu"
            aria-expanded={isAccountMenuOpen}
          >
            <div className="w-9 h-9 rounded-full bg-[#EADDC6] flex items-center justify-center shrink-0 group-hover:ring-2 group-hover:ring-gold transition-all">
              <span className="text-[#141C2B] font-bold text-[14px]">{getInitials(userName)}</span>
            </div>
            <div className="flex flex-col ml-3 overflow-hidden flex-1">
              <span className="text-[14px] font-bold text-white truncate" title={userName}>{userName}</span>
              <span className="text-[12px] text-slate-400 capitalize">{mockPlan} plan</span>
            </div>
            <MoreHorizontal size={18} className="text-slate-500 group-hover:text-white shrink-0 ml-2" />
          </button>
        </div>

        {/* Account Popover */}
        {isAccountMenuOpen && (
          <div 
            ref={menuRef}
            className="absolute bottom-[calc(100%-8px)] left-0 w-full mb-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 text-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-200"
            role="menu"
          >
            <div className="p-4 border-b border-slate-100 flex items-center">
              <div className="w-10 h-10 rounded-full bg-[#EADDC6] flex items-center justify-center shrink-0">
                <span className="text-[#141C2B] font-bold text-[15px]">{getInitials(userName)}</span>
              </div>
              <div className="flex flex-col ml-3 overflow-hidden">
                <span className="text-[15px] font-bold text-slate-900 truncate">{userName}</span>
                <span className="text-[13px] text-slate-500 truncate">{userEmail}</span>
              </div>
            </div>

            <div className="p-4 border-b border-slate-100">
              <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-3">PLAN</div>
              
              <div className="flex items-center justify-between mb-1">
                <span className="text-[14px] font-bold text-slate-900 capitalize">{mockPlan}</span>
                {mockPlan === 'free' && (
                  <Link href="/account" onClick={() => setIsAccountMenuOpen(false)} className="text-[13px] font-semibold text-[#141C2B] flex items-center hover:text-gold transition-colors">
                    Upgrade <ArrowRight size={14} className="ml-1" />
                  </Link>
                )}
              </div>
              
              <p className="text-[13px] text-slate-500 mb-5">
                {mockPlan === 'free' ? 'Basic access to Verba' : 'Active'}
              </p>

              <div className="mb-1 flex justify-between items-end">
                <span className="text-[13px] font-medium text-slate-700">AI allowance</span>
                <span className="text-[12px] font-medium text-slate-500">7 of 10 remaining</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                <div className="bg-[#141C2B] h-full rounded-full transition-all duration-500" style={{ width: '70%' }}></div>
              </div>
              <div className="text-[12px] text-slate-500">
                Resets Oct 1
              </div>
            </div>

            <div className="p-2 border-b border-slate-100 flex flex-col space-y-0.5">
              <Link href="/account#profile" onClick={() => setIsAccountMenuOpen(false)} className="flex items-center justify-between px-3 py-2 text-[14px] font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
                Account settings <ArrowRight size={14} className="text-slate-400" />
              </Link>
              <Link href="/account#billing" onClick={() => setIsAccountMenuOpen(false)} className="flex items-center justify-between px-3 py-2 text-[14px] font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
                Billing & plan <ArrowRight size={14} className="text-slate-400" />
              </Link>
              <Link href="/account#usage" onClick={() => setIsAccountMenuOpen(false)} className="flex items-center justify-between px-3 py-2 text-[14px] font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
                Usage <ArrowRight size={14} className="text-slate-400" />
              </Link>
            </div>

            <div className="p-2 flex flex-col space-y-0.5">
              <Link href="/help" onClick={() => setIsAccountMenuOpen(false)} className="flex items-center justify-between px-3 py-2 text-[14px] font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
                Help & support <ArrowUpRight size={14} className="text-slate-400" />
              </Link>
              <form action={logout}>
                <button type="submit" className="flex items-center w-full px-3 py-2 text-[14px] font-medium text-slate-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  Sign out
                </button>
              </form>
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
