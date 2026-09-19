'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Settings, Plus, User, LogOut, BookOpen, HelpCircle } from 'lucide-react';
import { logout } from '@/app/(auth)/actions';
import { NewWorkModal } from '@/components/NewWorkModal';

interface SidebarNavProps {
  userName?: string;
}

export function SidebarNav({ userName = 'Writer' }: SidebarNavProps) {
  const pathname = usePathname();
  const [isNewWorkModalOpen, setIsNewWorkModalOpen] = useState(false);

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

      <div className="mt-auto flex flex-col w-full">
        <div className="px-7 py-6">
          <div className="text-[12px] font-bold tracking-widest text-slate-500 uppercase mb-5">MY PROFILE</div>
          <div className="flex flex-col">
            <div className="w-14 h-14 rounded-full bg-[#EADDC6] flex items-center justify-center mb-4">
              <User size={28} className="text-[#141C2B]" />
            </div>
            <div className="text-[16px] font-bold text-white mb-2 truncate" title={userName}>{userName}</div>
            <div className="text-[12px] font-semibold text-slate-200 border border-slate-600/60 bg-slate-800/20 rounded-full px-3 py-1.5 w-fit">
              Professional Account
            </div>
          </div>
        </div>

        <div className="px-5 py-5 border-t border-slate-800/50">
           <Link href="/help" className="flex items-center text-[14px] text-slate-400 hover:text-white transition-colors">
             <HelpCircle size={18} className="mr-3" />
             Help & Tutorials
           </Link>
        </div>
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
