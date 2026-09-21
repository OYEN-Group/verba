import React, { useState } from 'react';
import { WorkspaceTab, WorkspaceNavigation } from './WorkspaceNavigation';
import { ResearchTab } from './ResearchTab';
import { CiteTab } from './CiteTab';
import { ReviewTab } from './ReviewTab';
import { ProvePanel } from './ProvePanel';
import { CitationIntegrityTab } from './CitationIntegrityTab';
import { ReviewEvidencePanel } from './ReviewEvidencePanel';
import { WritingAssistant, Issue } from '../WritingAssistant';
import { PanelRightClose } from 'lucide-react';
import { ContextualSelection } from '../DocumentEditor';

interface Props {
  documentId: string;
  onClose: () => void;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  activeHeadingText?: string | null;
  // Assistant Props
  blockId: string;
  paragraphText: string;
  issues?: Issue[];
  issue: Issue | null;
  contextualSelection?: ContextualSelection | null;
  onClearContextualSelection?: () => void;
  evidenceSelection?: ContextualSelection | null;
  onClearEvidenceSelection?: () => void;
  reviewEvidenceSelection?: ContextualSelection | null;
  onClearReviewEvidenceSelection?: () => void;
  onIssueSelect?: (id: string | null) => void;
  onSuggestionAction: (issueId: string, suggestionId: string, action: 'accepted' | 'rejected' | 'manually_edited', newText?: string) => void;
  onCloseIssue: () => void;
  // Review Props
  isAnalyzed: boolean;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  issuesCount: number;
  docStatus: string;
  analyzeError: string | null;
  onIssueCreated?: (issueId: string) => void;
  // Cite Props
  workId: string | null;
  projectContext?: Record<string, unknown>;
  onInsertCitation?: (sourceId: string) => void;
  editorHasFocus?: boolean;
  // Research Props
  onSourceSaved?: (newSource?: any) => void;
  // Integrity / Recovery Props
  onReplaceCitation?: (oldCitationId: string, candidateSource: any) => Promise<void>;
  onAddSupportingCitation?: (oldCitationId: string, candidateSource: any) => Promise<void>;
}

export function VerbaWorkspace({
  documentId,
  onClose,
  blockId,
  paragraphText,
  issues = [],
  issue,
  contextualSelection,
  onClearContextualSelection,
  evidenceSelection,
  onClearEvidenceSelection,
  reviewEvidenceSelection,
  onClearReviewEvidenceSelection,
  onIssueSelect,
  onSuggestionAction,
  onCloseIssue,
  isAnalyzed,
  isAnalyzing,
  onAnalyze,
  issuesCount,
  docStatus,
  analyzeError,
  onIssueCreated,
  workId,
  projectContext,
  onInsertCitation,
  editorHasFocus,
  onSourceSaved,
  onReplaceCitation,
  onAddSupportingCitation,
  activeTab,
  onTabChange,
  activeHeadingText,
}: Props) {

  // Derive selection for context
  const hasSelection = !!(contextualSelection || evidenceSelection || reviewEvidenceSelection || issue);
  const selectedPreview = paragraphText?.slice(0, 50) || issue?.original_text?.slice(0, 50) || '';

  const showContext = ['assistant', 'review', 'research', 'integrity'].includes(activeTab);

  return (
    <aside className="w-full sm:w-[370px] bg-[#F9FAFB] border-l border-border-light shrink-0 flex flex-col h-full absolute lg:relative right-0 z-20 shadow-2xl lg:shadow-none transition-all duration-300">
      <div className="flex flex-col shrink-0 bg-white border-b border-border-light">
        <div className="flex items-center justify-between p-4 pb-0">
          <div className="flex items-center space-x-2">
            <span className="text-[14px] font-semibold text-[#0B1628]">Hello, Student</span>
            <span className="text-[16px]">👋</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-foreground-muted hover:text-[#0B1628] hover:bg-black/5 rounded transition-colors -mr-1"
            title="Close Workspace"
          >
            <PanelRightClose size={16} />
          </button>
        </div>
        
        {/* Render WorkspaceNavigation here */}
        <div className="mt-2">
          <WorkspaceNavigation activeTab={activeTab} onTabChange={onTabChange} />
        </div>
        
        {showContext && (
          <div className="px-4 py-2 bg-[#F9FAFB] border-t border-border-light/50 text-[12px] text-foreground-secondary flex items-center leading-snug">
            {hasSelection ? (
              <span className="italic truncate max-w-[250px]">"{selectedPreview}..."</span>
            ) : activeHeadingText ? (
              <span className="truncate max-w-[250px]">§ {activeHeadingText}</span>
            ) : (
              <span>Whole document</span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'assistant' && (
          <WritingAssistant
            documentId={documentId}
            blockId={blockId}
            paragraphText={paragraphText}
            issues={issues}
            issue={issue}
            contextualSelection={contextualSelection}
            onClearContextualSelection={onClearContextualSelection}
            onIssueSelect={onIssueSelect}
            onClose={onCloseIssue}
            onSuggestionAction={onSuggestionAction}
            isAnalyzed={isAnalyzed}
            isAnalyzing={isAnalyzing}
            onAnalyze={onAnalyze}
            issuesCount={issuesCount}
            docStatus={docStatus}
            analyzeError={analyzeError}
            onIssueCreated={onIssueCreated}
            projectContext={projectContext}
          />
        )}
        {activeTab === 'review' && (
          <ReviewTab 
            isAnalyzed={isAnalyzed}
            isAnalyzing={isAnalyzing}
            onAnalyze={onAnalyze}
            issuesCount={issuesCount}
            docStatus={docStatus}
            analyzeError={analyzeError}
          />
        )}
        {activeTab === 'research' && (
          <ResearchTab 
            workId={workId} 
            onSourceSaved={onSourceSaved} 
            evidenceSelection={evidenceSelection}
            onClearEvidenceSelection={onClearEvidenceSelection}
            onInsertCitation={onInsertCitation}
          />
        )}
        {activeTab === 'cite' && (
          <CiteTab 
            documentId={documentId} 
            workId={workId} 
            onInsertCitation={onInsertCitation!} 
            editorHasFocus={editorHasFocus ?? false} 
          />
        )}
        {activeTab === 'integrity' && (
          <CitationIntegrityTab 
            documentId={documentId}
            workId={workId}
            projectContext={projectContext}
            onNavigate={(tab) => onTabChange(tab)}
            onReplaceCitation={onReplaceCitation}
            onAddSupportingCitation={onAddSupportingCitation}
          />
        )}
        {activeTab === 'evidence' && (
          <ReviewEvidencePanel 
            workId={workId || ''}
            documentId={documentId}
            selection={reviewEvidenceSelection || null}
            onFindEvidence={(text) => {
              if (onTabChange) onTabChange('research');
            }}
            onClearSelection={onClearReviewEvidenceSelection || (() => {})}
          />
        )}
        {activeTab === 'prove' && <ProvePanel documentId={documentId} />}
      </div>
    </aside>
  );
}
