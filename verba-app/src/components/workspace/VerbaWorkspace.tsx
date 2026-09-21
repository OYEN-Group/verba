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
  wordCount?: number | null;
  sourceCount?: number;
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
  wordCount,
  sourceCount,
}: Props) {

  // Derive selection for context
  const hasSelection = !!(contextualSelection || evidenceSelection || reviewEvidenceSelection || issue);
  const selectedPreview = paragraphText?.slice(0, 50) || issue?.original_text?.slice(0, 50) || '';

  const showContext = ['assistant', 'review', 'research', 'integrity'].includes(activeTab);

  return (
    <aside className="w-full sm:w-[400px] bg-white border border-border-light rounded-xl flex flex-col h-full absolute lg:relative right-6 top-6 z-20 shadow-[0_8px_30px_rgb(0,0,0,0.08)] lg:shadow-none transition-all duration-300 overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
      <div className="flex flex-col shrink-0 bg-white p-5 pb-0">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            <div className="mt-1">
              <Sparkles size={20} className="text-[#4E75C4]" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#0B1628]">Verba Workspace</h2>
              <p className="text-[13px] text-slate-500 mt-0.5">Everything you need, right here.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-[#0B1628] hover:bg-black/5 rounded-md transition-colors"
            title="Close Workspace"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="overflow-x-auto no-scrollbar mt-2 border-b border-border-light -mx-5 px-5">
          <WorkspaceNavigation activeTab={activeTab} onTabChange={onTabChange} />
        </div>
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
            wordCount={wordCount}
            sourceCount={sourceCount}
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
