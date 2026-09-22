'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, Folder, Search, Database, Shield, Settings, 
  MoreHorizontal, ChevronDown, Clock, HelpCircle
} from 'lucide-react';
import { logout } from '@/app/(auth)/actions';
import { createClient } from '@/lib/supabase/client';

interface SidebarNavProps {
  userName?: string;
  userEmail?: string;
  isCollapsed?: boolean;
}

interface WorkInfo {
  id: string;
  name: string;
}

export function SidebarNav({ userName = 'Writer', userEmail = '', isCollapsed = false }: SidebarNavProps) {
  const pathname = usePathname();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [recentWorks, setRecentWorks] = useState<WorkInfo[]>([]);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchWorks = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('works')
        .select('id, name, updated_at')
        .order('updated_at', { ascending: false })
        .limit(3);
        
      if (data) {
        setRecentWorks(data.map(d => ({ id: d.id, name: d.name || 'Untitled Work' })));
      }
    };
    fetchWorks();
  }, []);

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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => name.charAt(0).toUpperCase();

  const navItems = [
    { icon: Home, label: 'Home', href: '/dashboard' },
    { icon: Folder, label: 'Works', href: '/dashboard' }, // Link to dashboard or works route if exists
    { icon: Search, label: 'Research', href: '/library' },
    { icon: Database, label: 'Sources', href: '/library' },
  ];

  return (
    <div className="flex flex-col flex-1 h-full bg-[#0B121F] text-slate-300 overflow-y-auto overflow-x-hidden no-scrollbar pb-6">
      
      {/* Main Navigation */}
      <div className={`mt-2 ${isCollapsed ? 'px-2 space-y-4 flex flex-col items-center' : 'px-4 space-y-1'}`}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.label === 'Works' && pathname.startsWith('/workspace'));
          return (
            <Link 
              key={item.label}
              href={item.href}
              className={`flex items-center transition-colors rounded-lg relative ${
                isActive
                  ? (isCollapsed ? 'bg-[#1A2333] text-white' : 'bg-[#1A2333] text-white font-medium')
                  : 'text-[#8CA4CA] hover:text-white hover:bg-white/5 font-medium'
              } ${isCollapsed ? 'w-10 h-10 justify-center' : 'w-full h-[36px] px-3 space-x-3'}`}
            >
              {isActive && !isCollapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#4E75C4] rounded-r shadow-[0_0_8px_rgba(78,117,196,0.5)]" />
              )}
              <item.icon size={isCollapsed ? 20 : 16} strokeWidth={2} className={isActive ? 'text-[#4E75C4]' : ''} />
              {!isCollapsed && <span className="text-[13px]">{item.label}</span>}
            </Link>
          );
        })}

        <div className={`w-full h-px bg-white/5 ${isCollapsed ? 'my-4' : 'my-2'}`} />
        
        <Link 
          href="/prove" 
          className={`flex items-center transition-colors rounded-lg relative ${
            pathname === '/prove'
              ? (isCollapsed ? 'bg-[#1A2333] text-white' : 'bg-[#1A2333] text-white font-medium')
              : 'text-[#8CA4CA] hover:text-white hover:bg-white/5 font-medium'
          } ${isCollapsed ? 'w-10 h-10 justify-center' : 'w-full h-[36px] px-3 space-x-3'}`}
        >
          <Shield size={isCollapsed ? 20 : 16} strokeWidth={2} className={pathname === '/prove' ? 'text-[#4E75C4]' : ''} />
          {!isCollapsed && <span className="text-[13px]">Prove</span>}
        </Link>
      </div>

      {/* Recent Works */}
      {!isCollapsed && recentWorks.length > 0 && (
        <div className="px-4 mt-6">
          <div className="px-3 mb-2 flex items-center space-x-2">
            <Clock size={12} className="text-slate-500" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Recent</span>
          </div>
          <div className="space-y-0.5">
            {recentWorks.map((work) => (
              <Link 
                key={work.id} 
                href={`/dashboard`} 
                className="flex items-center px-3 py-1.5 rounded hover:bg-white/5 group text-[13px] text-[#8CA4CA] hover:text-white transition-colors"
              >
                <span className="truncate">{work.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-col w-full">
        <div className={`w-full h-px bg-white/5 ${isCollapsed ? 'mb-4' : 'mb-3'}`} />

        {/* Profile & Settings Footer */}
        <div className={`flex flex-col ${isCollapsed ? 'space-y-4 px-2' : 'px-4'}`}>
          
          <div className={`flex ${isCollapsed ? 'flex-col space-y-4 items-center' : 'items-center space-x-1 mb-2'}`}>
            <Link href="/settings" className={`rounded-lg flex items-center text-[#8CA4CA] hover:text-white hover:bg-white/5 transition-colors ${isCollapsed ? 'w-10 h-10 justify-center' : 'w-full h-[36px] px-3 space-x-3'}`}>
              <Settings size={16} />
              {!isCollapsed && <span className="text-[13px] font-medium">Settings</span>}
            </Link>
            {!isCollapsed && (
              <Link href="/help" className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-[#8CA4CA] hover:text-white hover:bg-white/5 transition-colors" title="Help">
                <HelpCircle size={16} />
              </Link>
            )}
          </div>

          <div className="relative w-full">
            <button 
              ref={triggerRef}
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              className={`flex items-center w-full rounded-lg hover:bg-white/5 transition-colors text-left ${isCollapsed ? 'justify-center p-1' : 'p-2 space-x-3'}`}
            >
              <div className="w-8 h-8 rounded-full bg-[#4E75C4] flex items-center justify-center text-white shrink-0">
                <span className="text-[13px] font-bold leading-none">
                  {getInitials(userName)}
                </span>
              </div>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[13px] font-medium text-white truncate leading-tight">{userName}</span>
                </div>
              )}
            </button>

            {isAccountMenuOpen && (
              <div 
                ref={menuRef}
                className="absolute bottom-full left-12 mb-2 w-48 bg-white border border-border-light rounded-lg shadow-xl overflow-hidden z-50"
              >
                <div className="p-1">
                  <button 
                    onClick={async () => {
                      setIsAccountMenuOpen(false);
                      await logout();
                    }}
                    className="flex items-center w-full px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 rounded transition-colors text-left font-medium"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
