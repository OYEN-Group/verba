'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, FileText, Search, Database, Shield, Crown, Settings, 
  HelpCircle, MoreHorizontal, ArrowRight, ChevronDown, ChevronUp, Plus, Pin
} from 'lucide-react';
import { logout } from '@/app/(auth)/actions';
import { createClient } from '@/lib/supabase/client';
import { NewWorkModal } from '@/components/NewWorkModal';

interface SidebarNavProps {
  userName?: string;
  userEmail?: string;
  isCollapsed?: boolean;
}

interface DocumentInfo {
  id: string;
  title: string;
}

export function SidebarNav({ userName = 'Writer', userEmail = '', isCollapsed = false }: SidebarNavProps) {
  const pathname = usePathname();
  const [isNewWorkModalOpen, setIsNewWorkModalOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isDocumentsExpanded, setIsDocumentsExpanded] = useState(true);
  const [recentDocs, setRecentDocs] = useState<DocumentInfo[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      const supabase = createClient();
      
      // Fetch total count for storage
      const { count } = await supabase.from('documents').select('*', { count: 'exact', head: true });
      setTotalDocs(count || 0);

      // Fetch recent docs
      const { data } = await supabase.from('documents')
        .select('id, title, updated_at')
        .order('updated_at', { ascending: false })
        .limit(3);
        
      if (data) {
        setRecentDocs(data.map(d => ({ id: d.id, title: d.title || 'Untitled Document' })));
      }
    };
    fetchDocs();
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
  const maxDocs = 5;
  const storagePercentage = Math.min(100, Math.round((totalDocs / maxDocs) * 100));

  return (
    <div className="flex flex-col flex-1 h-full bg-[#0B121F] text-slate-300 overflow-y-auto overflow-x-hidden no-scrollbar pb-6">
      
      {/* Workspace Switcher & New Document (Expanded) */}
      {!isCollapsed && (
        <div className="px-4 py-2 space-y-4">
          <button className="flex items-center justify-between w-full h-[40px] px-3 bg-[#131B2B] border border-white/5 rounded-lg hover:bg-white/5 transition-colors">
            <span className="text-white text-[13px] font-medium">Personal Workspace</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
          
          <button 
            onClick={() => setIsNewWorkModalOpen(true)}
            className="flex items-center justify-center w-full h-[40px] bg-[#C59E60] text-[#0B121F] font-bold rounded-lg hover:bg-[#A07D45] transition-colors shadow-sm"
          >
            <Plus size={16} className="mr-2" strokeWidth={2.5} />
            <span className="text-[14px]">New document</span>
          </button>
          
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search documents..." 
              className="w-full h-[36px] bg-[#131B2B] border border-white/5 rounded-lg pl-9 pr-12 text-[13px] text-white placeholder:text-slate-500 focus:outline-none focus:border-white/10"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
              <span className="text-[10px] text-slate-400 font-medium">Ctrl + K</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <div className={`mt-2 ${isCollapsed ? 'px-2 space-y-4 flex flex-col items-center' : 'px-4 space-y-1'}`}>
        <Link 
          href="/dashboard"
          className={`flex items-center transition-colors rounded-lg relative ${
            pathname === '/dashboard' || pathname.startsWith('/workspace')
              ? (isCollapsed ? 'bg-[#1A2333] text-[#C59E60]' : 'bg-[#1A2333] text-white font-bold')
              : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
          } ${isCollapsed ? 'w-10 h-10 justify-center' : 'w-full h-[40px] px-3 space-x-3'}`}
        >
          {!isCollapsed && (pathname === '/dashboard' || pathname.startsWith('/workspace')) && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-[#C59E60] to-[#A07D45] rounded-r-md shadow-[0_0_10px_rgba(197,158,96,0.5)]" />
          )}
          <Home size={isCollapsed ? 20 : 18} strokeWidth={pathname === '/dashboard' ? 2.5 : 2} className={isCollapsed && (pathname === '/dashboard' || pathname.startsWith('/workspace')) ? 'text-[#C59E60]' : ''} />
          {!isCollapsed && <span className="text-[14px]">Home</span>}
        </Link>

        {/* Documents Section */}
        <div className="w-full">
          <button 
            onClick={() => !isCollapsed && setIsDocumentsExpanded(!isDocumentsExpanded)}
            className={`flex items-center transition-colors rounded-lg ${
              pathname === '/documents' 
                ? 'text-white font-bold' 
                : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
            } ${isCollapsed ? 'w-10 h-10 justify-center mt-4' : 'w-full h-[40px] px-3 justify-between'}`}
          >
            <div className="flex items-center space-x-3">
              <FileText size={isCollapsed ? 20 : 18} strokeWidth={2} />
              {!isCollapsed && <span className="text-[14px]">Documents</span>}
            </div>
            {!isCollapsed && (
              isDocumentsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />
            )}
          </button>
          
          {/* Recent Docs */}
          {!isCollapsed && isDocumentsExpanded && recentDocs.length > 0 && (
            <div className="mt-2 bg-[#131B2B]/50 rounded-lg p-2">
              <div className="px-2 py-1 mb-1">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Recent</span>
              </div>
              <div className="space-y-0.5">
                {recentDocs.map((doc, idx) => (
                  <Link key={doc.id} href={`/workspace/${doc.id}`} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/5 group">
                    <span className="text-[13px] text-slate-300 group-hover:text-white truncate pr-2 flex-1">{doc.title}</span>
                    {idx === 0 && <Pin size={12} className="text-slate-400 shrink-0" />}
                  </Link>
                ))}
                <button className="flex items-center px-2 py-1.5 w-full text-left rounded hover:bg-white/5 mt-1">
                  <span className="text-[12px] text-slate-400 font-medium">Show more</span>
                  <ChevronDown size={12} className="text-slate-500 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Secondary Nav */}
        <div className={`pt-4 pb-2 ${isCollapsed ? 'flex flex-col items-center space-y-4' : 'space-y-1'}`}>
          <Link href="/library" className={`flex items-center transition-colors rounded-lg text-slate-400 hover:text-white hover:bg-white/5 font-medium ${isCollapsed ? 'w-10 h-10 justify-center' : 'w-full h-[40px] px-3 space-x-3'}`}>
            <Search size={isCollapsed ? 20 : 18} strokeWidth={2} />
            {!isCollapsed && <span className="text-[14px]">Research</span>}
          </Link>
          <Link href="/library" className={`flex items-center transition-colors rounded-lg text-slate-400 hover:text-white hover:bg-white/5 font-medium ${isCollapsed ? 'w-10 h-10 justify-center' : 'w-full h-[40px] px-3 space-x-3'}`}>
            <Database size={isCollapsed ? 20 : 18} strokeWidth={2} />
            {!isCollapsed && <span className="text-[14px]">Sources</span>}
          </Link>
          
          <div className={`w-full h-px bg-white/10 ${isCollapsed ? 'my-4' : 'my-2'}`} />
          
          <Link href="/prove" className={`flex items-center transition-colors rounded-lg text-slate-400 hover:text-white hover:bg-white/5 font-medium ${isCollapsed ? 'w-10 h-10 justify-center' : 'w-full h-[40px] px-3 space-x-3'}`}>
            <Shield size={isCollapsed ? 20 : 18} strokeWidth={2} />
            {!isCollapsed && <span className="text-[14px]">Prove</span>}
          </Link>
        </div>
      </div>

      <div className="mt-auto flex flex-col w-full">
        
        {/* Professional Card */}
        <div className={`mb-6 ${isCollapsed ? 'px-2 flex justify-center' : 'px-4'}`}>
          {isCollapsed ? (
            <Link href="/professional" className="w-10 h-10 rounded-lg flex items-center justify-center text-[#C59E60] hover:bg-white/5 transition-colors">
              <Crown size={20} strokeWidth={2.5} />
            </Link>
          ) : (
            <div className="relative p-[1px] rounded-xl overflow-hidden group cursor-pointer shadow-[0_0_15px_rgba(197,158,96,0.15)] hover:shadow-[0_0_20px_rgba(197,158,96,0.3)] transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-[#C59E60]/80 via-blue-500/30 to-purple-500/30 opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-[#0B121F] rounded-xl p-4 flex flex-col h-full z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Crown size={16} className="text-[#C59E60]" strokeWidth={2.5} />
                    <span className="text-white font-bold text-[14px]">Go Professional</span>
                  </div>
                  <ArrowRight size={14} className="text-slate-400" />
                </div>
                <p className="text-[#8CA4CA] text-[12px] leading-snug">
                  Unlock unlimited documents, advanced research and more.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Storage */}
        {!isCollapsed && (
          <div className="px-5 mb-6">
            <p className="text-slate-400 text-[12px] font-medium mb-2">Storage</p>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
              <div className="h-full bg-gradient-to-r from-[#C59E60] to-[#E3C58B] rounded-full" style={{ width: `${storagePercentage}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">{totalDocs} / {maxDocs} documents used</span>
              <span className="text-slate-400 text-[11px] font-medium">{storagePercentage}%</span>
            </div>
          </div>
        )}

        <div className={`w-full h-px bg-white/10 ${isCollapsed ? 'mb-4' : 'mb-3'}`} />

        {/* Profile & Settings Footer */}
        <div className={`flex items-center ${isCollapsed ? 'flex-col space-y-4 px-2' : 'justify-between px-4'}`}>
          <div className="relative">
            <button 
              ref={triggerRef}
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              className={`flex items-center space-x-3 rounded-xl hover:bg-white/5 transition-colors text-left ${isCollapsed ? 'p-1' : 'p-1.5'}`}
            >
              <div className="w-9 h-9 rounded-full bg-[#8CA4CA] flex items-center justify-center text-[#0B121F] shrink-0">
                <span className="text-[14px] font-bold leading-none">
                  {getInitials(userName)}
                </span>
              </div>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-[13px] font-bold text-white truncate leading-tight">{userName}</span>
                  <span className="text-[11px] text-slate-400 truncate mt-0.5">Free Plan</span>
                </div>
              )}
              {!isCollapsed && <MoreHorizontal size={14} className="text-slate-500 shrink-0 ml-1" />}
            </button>

            {isAccountMenuOpen && (
              <div 
                ref={menuRef}
                className="absolute bottom-full left-12 mb-2 w-48 bg-[#161B22] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50"
              >
                <div className="p-2">
                  <button 
                    onClick={async () => {
                      setIsAccountMenuOpen(false);
                      await logout();
                    }}
                    className="flex items-center w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 rounded-md transition-colors text-left"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={`flex ${isCollapsed ? 'flex-col space-y-4' : 'items-center space-x-1'}`}>
            <Link href="/settings" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <Settings size={18} />
            </Link>
            <Link href="/help" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <HelpCircle size={18} />
            </Link>
          </div>
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
