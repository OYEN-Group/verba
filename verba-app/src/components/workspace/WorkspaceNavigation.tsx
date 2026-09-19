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
    <div className="flex items-center justify-center bg-white border-t border-border-light shrink-0 h-[56px] w-full z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
      <div className="flex items-center space-x-1 lg:space-x-4 max-w-3xl w-full px-4 justify-between lg:justify-center h-full">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as WorkspaceTab)}
              className={`relative flex items-center gap-2 px-3 lg:px-4 h-full transition-colors ${
                isActive 
                  ? 'text-accent font-medium' 
                  : 'text-foreground-secondary hover:text-[#0B1628] hover:bg-black/5 rounded-md my-1' // slightly rounded hover effect
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-0 w-full h-[2px] bg-accent rounded-b-sm" />
              )}
              <tab.icon size={16} className={isActive ? 'text-accent' : ''} />
              <span className="text-[13px] hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
