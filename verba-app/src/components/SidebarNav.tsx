'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Settings, Plus, User, LogOut, BookOpen, HelpCircle } from 'lucide-react';
import { logout } from '@/app/(auth)/actions';
import { NewWorkModal } from '@/components/NewWorkModal';

export function SidebarNav() {
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
      
      <div className="px-3 space-y-1">
        {primaryNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              className={`flex items-center px-4 py-2.5 h-[42px] text-[14px] font-medium transition-colors rounded-lg ${
                isActive 
                  ? 'bg-navy-active text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-navy-hover'
              }`}
            >
              <item.icon size={18} className={`mr-4 shrink-0 ${isActive ? 'text-gold' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col w-full">
        <div className="px-7 py-4">
          <div className="text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-4">MY PROFILE</div>
          <div className="flex flex-col">
            <div className="w-12 h-12 rounded-full bg-gold-border flex items-center justify-center mb-3">
              <User size={24} className="text-navy" />
            </div>
            <div className="text-[14px] font-bold text-white mb-1">Mayowa</div>
            <div className="text-[11px] font-medium text-slate-300 border border-slate-600 rounded-full px-3 py-1 w-fit">
              Professional Account
            </div>
          </div>
        </div>

        <div className="px-4 py-4 border-t border-slate-800">
           <Link href="/help" className="flex items-center text-[13px] text-slate-400 hover:text-white transition-colors">
             <HelpCircle size={16} className="mr-3" />
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
