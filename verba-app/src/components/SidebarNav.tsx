'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, Folder, Search, Database, Shield, Settings, 
  HelpCircle, Plus
} from 'lucide-react';
import { logout } from '@/app/(auth)/actions';
import { createClient } from '@/lib/supabase/client';
import { NewWorkModal } from '@/components/NewWorkModal';

interface SidebarNavProps {
  userName?: string;
  userEmail?: string;
  isCollapsed?: boolean;
}

interface WorkInfo {
  id: string;
  name: string;
  updatedAt: string;
}

export function SidebarNav({ userName = 'Writer', userEmail = '', isCollapsed = false }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isNewWorkOpen, setIsNewWorkOpen] = useState(false);
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
        setRecentWorks(data.map(d => ({ 
          id: d.id, 
          name: d.name || 'Untitled Work',
          updatedAt: d.updated_at
        })));
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

  const getInitials = (name: string) => name ? name.charAt(0).toUpperCase() : 'M';

  const navItems = [
    { icon: Home, label: 'Home', href: '/dashboard' },
    { icon: Folder, label: 'Works', href: '/documents' }, 
    { icon: Search, label: 'Research', href: '/library' },
    { icon: Database, label: 'Sources', href: '/sources' },
  ];

  return (
    <div className="flex flex-col flex-1 h-full bg-[#0B121F] text-[#E2E8F0] overflow-y-auto overflow-x-hidden no-scrollbar pb-6">
      
      {/* New Work Button */}
      <div className={`mt-[16px] mb-[24px] ${isCollapsed ? 'px-2 flex justify-center' : 'px-4'}`}>
        <button 
          onClick={() => setIsNewWorkOpen(true)}
          title={isCollapsed ? "New work" : undefined}
          className={`flex items-center justify-center bg-[#4E75C4] hover:bg-[#3f62a8] text-white transition-colors rounded-[8px] font-medium ${isCollapsed ? 'w-[40px] h-[40px]' : 'w-full h-[38px] space-x-2'}`}
        >
          <Plus size={16} strokeWidth={2.5} />
          {!isCollapsed && <span className="text-[14px]">New work</span>}
        </button>
      </div>

      <NewWorkModal 
        isOpen={isNewWorkOpen}
        onClose={() => setIsNewWorkOpen(false)}
        onUploadSelect={() => {
          setIsNewWorkOpen(false);
          router.push('/upload');
        }}
      />

      {/* Main Navigation */}
      <div className={`mb-[24px] ${isCollapsed ? 'px-2 space-y-[2px] flex flex-col items-center' : 'px-3 space-y-[2px]'}`}>
        {!isCollapsed && (
          <div className="px-3 mb-[8px]">
            <span className="text-[10px] font-semibold text-[#64748B] tracking-[0.1em]">MAIN</span>
          </div>
        )}
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.label === 'Works' && pathname.startsWith('/workspace'));
          return (
            <Link 
              key={item.label}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center transition-colors rounded-[6px] relative ${
                isActive
                  ? 'bg-[#162032] text-white font-medium'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
              } ${isCollapsed ? 'w-10 h-10 justify-center' : 'w-full h-[34px] px-3 space-x-3'}`}
            >
              {isActive && !isCollapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[#4E75C4] rounded-r" />
              )}
              <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-[#4E75C4]' : ''} />
              {!isCollapsed && <span className="text-[13px]">{item.label}</span>}
            </Link>
          );
        })}
      </div>
      
      {/* Prove Navigation */}
      <div className={`mb-[24px] ${isCollapsed ? 'px-2 space-y-[2px] flex flex-col items-center' : 'px-3 space-y-[2px]'}`}>
        {!isCollapsed && (
          <div className="px-3 mb-[8px]">
            <span className="text-[10px] font-semibold text-[#64748B] tracking-[0.1em]">PROVE</span>
          </div>
        )}
        <Link 
          href="/prove" 
          title={isCollapsed ? 'Prove' : undefined}
          className={`flex items-center transition-colors rounded-[6px] relative ${
            pathname === '/prove'
              ? 'bg-[#162032] text-white font-medium'
              : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
          } ${isCollapsed ? 'w-10 h-10 justify-center' : 'w-full h-[34px] px-3 space-x-3'}`}
        >
          {pathname === '/prove' && !isCollapsed && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[#4E75C4] rounded-r" />
          )}
          <Shield size={16} strokeWidth={pathname === '/prove' ? 2.5 : 2} className={pathname === '/prove' ? 'text-[#4E75C4]' : ''} />
          {!isCollapsed && <span className="text-[13px]">Prove</span>}
        </Link>
      </div>

      {/* Recent Works */}
      {!isCollapsed && recentWorks.length > 0 && (
        <div className="px-3 mb-[24px]">
          <div className="px-3 mb-[8px]">
            <span className="text-[10px] font-semibold text-[#64748B] tracking-[0.1em]">RECENT WORKS</span>
          </div>
          <div className="space-y-[2px]">
            {recentWorks.map((work) => (
              <Link 
                key={work.id} 
                href={`/work/${work.id}/develop`} 
                className="flex items-center px-3 h-[34px] rounded-[6px] hover:bg-white/5 text-[13px] text-[#94A3B8] hover:text-white transition-colors"
                title={work.name}
              >
                <span className="truncate">{work.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Flexible spacer */}
      <div className="mt-auto flex flex-col w-full">
        {/* Settings and Help */}
        <div className={`flex flex-col mb-[16px] ${isCollapsed ? 'space-y-[2px] px-2 items-center' : 'px-3 space-y-[2px]'}`}>
          <Link 
            href="/settings" 
            title={isCollapsed ? 'Settings' : undefined}
            className={`flex items-center text-[#94A3B8] hover:text-white hover:bg-white/5 transition-colors rounded-[6px] ${isCollapsed ? 'w-10 h-10 justify-center' : 'w-full h-[34px] px-3 space-x-3'}`}
          >
            <Settings size={16} strokeWidth={2} />
            {!isCollapsed && <span className="text-[13px]">Settings</span>}
          </Link>
          <Link 
            href="/help" 
            title={isCollapsed ? 'Help & Support' : undefined}
            className={`flex items-center text-[#94A3B8] hover:text-white hover:bg-white/5 transition-colors rounded-[6px] ${isCollapsed ? 'w-10 h-10 justify-center' : 'w-full h-[34px] px-3 space-x-3'}`}
          >
            <HelpCircle size={16} strokeWidth={2} />
            {!isCollapsed && <span className="text-[13px]">Help & Support</span>}
          </Link>
        </div>

        <div className={`w-full h-px bg-white/10 ${isCollapsed ? 'mb-3' : 'mb-3'}`} />

        {/* Account Area */}
        <div className={`px-3 ${isCollapsed ? 'px-2' : ''}`}>
          <div className="relative w-full">
            <button 
              ref={triggerRef}
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              className={`flex items-center w-full rounded-[8px] hover:bg-white/5 transition-colors text-left ${isCollapsed ? 'justify-center p-1' : 'p-2 space-x-3'}`}
            >
              <div className="w-[30px] h-[30px] rounded-full bg-[#1E293B] flex items-center justify-center text-white shrink-0 border border-white/10">
                <span className="text-[12px] font-bold leading-none">
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
                className="absolute bottom-full left-[10px] mb-2 w-48 bg-white border border-[#1E293B] rounded-lg shadow-xl overflow-hidden z-50"
              >
                <div className="p-1">
                  <button 
                    onClick={async () => {
                      setIsAccountMenuOpen(false);
                      await logout();
                    }}
                    className="flex items-center w-full px-3 py-2 text-[13px] text-red-500 hover:bg-red-500/10 rounded transition-colors text-left font-medium"
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
