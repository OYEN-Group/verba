import React from 'react';
import { Sparkles, Target, BookOpen, FileText } from 'lucide-react';

export type WorkspaceTab = 'assistant' | 'review' | 'research' | 'cite' | 'integrity' | 'prove' | 'evidence' | 'sources';

interface Props {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
}

export function WorkspaceNavigation({ activeTab, onTabChange }: Props) {
  const tabs = [
    { id: 'assistant', label: 'Verba', icon: Sparkles },
    { id: 'research', label: 'Research', icon: Target },
    { id: 'sources', label: 'Sources', icon: BookOpen },
    { id: 'evidence', label: 'Evidence', icon: FileText },
  ] as const;

  return (
    <div className="flex items-center justify-between w-full h-[50px] z-20 px-1 pb-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id || (activeTab === 'cite' && tab.id === 'sources');
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as WorkspaceTab)}
            className={`relative flex flex-col items-center justify-center gap-1 w-full h-full transition-colors text-[11px] font-medium ${
              isActive 
                ? 'text-[#4E75C4]' 
                : 'text-slate-500 hover:text-[#0B1628]'
            }`}
          >
            <tab.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
            <span>{tab.label}</span>
            {isActive && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[2px] bg-[#4E75C4] rounded-t-sm" />
            )}
          </button>
        );
      })}
    </div>
  );
}
