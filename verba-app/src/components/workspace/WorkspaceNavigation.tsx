import React from 'react';
import { Sparkles, Eye, Search, BookOpen, ShieldCheck, BadgeCheck } from 'lucide-react';

export type WorkspaceTab = 'assistant' | 'review' | 'research' | 'cite' | 'integrity' | 'prove' | 'evidence';

interface Props {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
}

export function WorkspaceNavigation({ activeTab, onTabChange }: Props) {
  const tabs = [
    { id: 'assistant', label: 'Assistant', icon: Sparkles },
    { id: 'review', label: 'Review', icon: Eye },
    { id: 'research', label: 'Research', icon: Search },
    { id: 'cite', label: 'Cite', icon: BookOpen },
    { id: 'integrity', label: 'Integrity', icon: BadgeCheck },
    { id: 'prove', label: 'PROVE', icon: ShieldCheck },
  ] as const;

  return (
    <div className="flex items-center justify-center bg-[#F9FAFB] border-t border-border-light shrink-0 h-[40px] w-full z-20">
      <div className="flex items-center space-x-1 sm:space-x-4 max-w-3xl w-full px-4 justify-between lg:justify-center h-full">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as WorkspaceTab)}
              className={`relative flex items-center gap-1.5 px-3 h-full transition-colors text-[12px] ${
                isActive 
                  ? 'text-[#0B1628] font-medium' 
                  : 'text-foreground-secondary hover:text-[#0B1628]'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-0 w-full h-[2px] bg-accent" />
              )}
              <tab.icon size={13} className={isActive ? 'text-accent' : 'opacity-70'} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
