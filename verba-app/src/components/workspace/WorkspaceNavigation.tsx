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
    <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-border-light shrink-0">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as WorkspaceTab)}
            aria-label={tab.label}
            title={tab.label}
            className={`relative flex items-center justify-center w-8 h-8 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 ${
              isActive 
                ? 'text-accent bg-accent/10' 
                : 'text-foreground-secondary hover:text-[#0B1628] hover:bg-black/5'
            }`}
          >
            <tab.icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
