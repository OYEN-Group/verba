'use client';

import React, { useState } from 'react';
import { Check, X, RefreshCw, Edit2, Loader2, ShieldCheck, Zap, Sparkles, Eye, Search, BookOpen, BadgeCheck, FileText, ArrowRight } from 'lucide-react';

import { ContextualSelection } from './DocumentEditor';

interface Suggestion {
  id: string;
  suggested_text: string;
  explanation: string;
  status: string;
}

export interface Issue {
  id: string;
  status: string;
  issue_type: string;
  original_text: string;
  explanation: string;
  suggestions: Suggestion[];
}

interface Props {
  documentId: string;
  blockId: string;
  paragraphText: string;
  issue: Issue | null;
  contextualSelection?: ContextualSelection | null;
  onClearContextualSelection?: () => void;
  onClose: () => void;
  onSuggestionAction: (issueId: string, suggestionId: string, action: 'accepted' | 'rejected' | 'manually_edited', newText?: string) => void;
  isAnalyzed: boolean;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  issues?: Issue[];
  onIssueSelect?: (id: string | null) => void;
  issuesCount?: number;
  docStatus?: string;
  analyzeError?: string | null;
  onIssueCreated?: (issueId: string) => void;
  projectContext?: Record<string, unknown>;
  onNavigateTab?: (tab: string) => void;
  wordCount?: number | null;
  sourceCount?: number;
}

export function WritingAssistant({ 
  documentId, 
  blockId, 
  paragraphText, 
  issue, 
  contextualSelection,
  onClearContextualSelection,
  onClose, 
  onSuggestionAction, 
  isAnalyzed, 
  issues = [], 
  onIssueSelect,
  onAnalyze,
  issuesCount = 0, 
  docStatus = '', 
  analyzeError = null,
  onIssueCreated,
  projectContext,
  onNavigateTab,
  wordCount,
  sourceCount
}: Props) {
  const [loadingAlternative, setLoadingAlternative] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  
  // Contextual Edit State
  const [instruction, setInstruction] = useState('');
  const [isGeneratingContextual, setIsGeneratingContextual] = useState(false);

  // Analysis engine error takes top priority

  if (analyzeError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white">
        <div className="w-12 h-12 rounded-full bg-[#FEF3F2] flex items-center justify-center mb-4 text-[#B42318]">
          <Zap size={24} />
        </div>
        <h3 className="text-[14px] font-semibold text-[#0B1628] mb-2">Analysis failed</h3>
        <p className="text-[14px] text-foreground-secondary mb-6 leading-relaxed max-w-[240px]">
          {analyzeError}
        </p>
      </div>
    );
  }
  
  if (docStatus === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white">
        <div className="w-12 h-12 rounded-full bg-[#FEF3F2] flex items-center justify-center mb-4 text-[#B42318]">
          <Zap size={24} />
        </div>
        <h3 className="text-[14px] font-semibold text-[#0B1628] mb-2">Analysis failed</h3>
        <p className="text-[14px] text-foreground-secondary mb-6 leading-relaxed max-w-[240px]">
          Analysis failed. Head over to the Review tab to try again.
        </p>
      </div>
    );
  }

  const handleGenerateContextual = async () => {
    if (!contextualSelection || !instruction.trim()) return;
    setIsGeneratingContextual(true);
    
    try {
      const res = await fetch(`/api/documents/${documentId}/contextual-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: contextualSelection.blockId,
          paragraphText: contextualSelection.paragraphText,
          originalText: contextualSelection.originalText,
          userInstruction: instruction,
          projectContext
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.issue_id) {
          if (onClearContextualSelection) onClearContextualSelection();
          if (onIssueCreated) {
            onIssueCreated(data.issue_id);
          }
        }
      } else {
        console.error('Failed to generate edit:', await res.text());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingContextual(false);
    }
  };

  if (contextualSelection) {
    return (
      <div className="flex flex-col h-full bg-white relative">
        <div className="flex items-center justify-between p-4 border-b border-border-light bg-white sticky top-0 z-10 shrink-0">
          <h3 className="text-[13px] font-semibold text-[#0B1628] uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            Ask Verba
          </h3>
          <button onClick={onClearContextualSelection} className="p-1 hover:bg-background-secondary rounded text-foreground-secondary hover:text-[#0B1628] transition-colors">
            <X size={16} />
          </button>
        </div>
        
        <div className="p-5 flex-1 overflow-y-auto space-y-7">
          <div>
            <h4 className="text-[11px] font-semibold text-foreground-secondary uppercase tracking-wider mb-2">Selected Text</h4>
            <p className="text-[14px] text-ink bg-background-pale p-3 rounded-md border border-border-light leading-relaxed">
              {contextualSelection.originalText}
            </p>
          </div>
          
          <div>
            <h4 className="text-[11px] font-semibold text-foreground-secondary uppercase tracking-wider mb-2">Instruction</h4>
            <textarea
              placeholder="e.g. Make this sound more professional..."
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              className="w-full min-h-[100px] text-[14px] text-ink border border-border-light rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-accent leading-relaxed bg-white resize-y"
              autoFocus
            />
          </div>
        </div>

        <div className="p-4 border-t border-border-light bg-white shrink-0 z-10">
          <button 
            onClick={handleGenerateContextual}
            disabled={!instruction.trim() || isGeneratingContextual}
            className="w-full h-[36px] bg-[#0B1628] text-white rounded-md hover:bg-accent transition-colors text-[13px] font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGeneratingContextual ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {isGeneratingContextual ? 'Generating...' : 'Generate Edit'}
          </button>
        </div>
      </div>
    );
  }

  if (!issue && !contextualSelection) {
    return (
      <div className="flex flex-col h-full bg-white relative">
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          
          <div className="flex flex-col items-center text-center space-y-2 mt-2">
            <div className="w-12 h-12 rounded-full bg-[#F0F4FF] flex items-center justify-center text-[#4E75C4] mb-2 shadow-[0_0_15px_rgba(78,117,196,0.2)]">
              <Sparkles size={24} />
            </div>
            <h2 className="text-[16px] font-bold text-[#0B1628]">Good afternoon, {(projectContext?.user_name as string) || 'mayowa'}</h2>
            <p className="text-[13px] text-slate-500">How can I help with your writing today?</p>
          </div>

          <div className="relative mt-6">
            <input
              type="text"
              placeholder="Ask Verba anything..."
              className="w-full text-[13px] bg-white border border-border-light rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:border-[#4E75C4] focus:ring-1 focus:ring-[#4E75C4] shadow-sm transition-all"
              onClick={() => onAnalyze()}
              readOnly
            />
            <button 
              onClick={() => onAnalyze()}
              className="absolute top-1/2 -translate-y-1/2 right-2 w-7 h-7 rounded-lg bg-[#CBD5E1] text-white flex items-center justify-center hover:bg-[#4E75C4] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <button className="flex flex-col items-start p-3 bg-white border border-border-light rounded-xl hover:border-[#4E75C4] hover:shadow-sm transition-all text-left">
              <div className="w-6 h-6 rounded-md bg-[#F0F4FF] text-[#4E75C4] flex items-center justify-center mb-2">
                <FileText size={14} />
              </div>
              <span className="text-[12px] font-bold text-[#0B1628] mb-0.5">Explain</span>
              <span className="text-[10px] text-slate-500 leading-tight">Get a clearer<br/>understanding</span>
            </button>
            
            <button className="flex flex-col items-start p-3 bg-white border border-border-light rounded-xl hover:border-[#4E75C4] hover:shadow-sm transition-all text-left">
              <div className="w-6 h-6 rounded-md bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center mb-2">
                <Edit2 size={14} />
              </div>
              <span className="text-[12px] font-bold text-[#0B1628] mb-0.5">Improve</span>
              <span className="text-[10px] text-slate-500 leading-tight">Strengthen your writing</span>
            </button>

            <button className="flex flex-col items-start p-3 bg-white border border-border-light rounded-xl hover:border-[#4E75C4] hover:shadow-sm transition-all text-left">
              <div className="w-6 h-6 rounded-md bg-[#ECFDF5] text-[#10B981] flex items-center justify-center mb-2">
                <Search size={14} />
              </div>
              <span className="text-[12px] font-bold text-[#0B1628] mb-0.5">Find Evidence</span>
              <span className="text-[10px] text-slate-500 leading-tight">Search for supporting<br/>sources</span>
            </button>

            <button className="flex flex-col items-start p-3 bg-white border border-border-light rounded-xl hover:border-[#4E75C4] hover:shadow-sm transition-all text-left">
              <div className="w-6 h-6 rounded-md bg-[#FFF7ED] text-[#F97316] flex items-center justify-center mb-2">
                <BookOpen size={14} />
              </div>
              <span className="text-[12px] font-bold text-[#0B1628] mb-0.5">Cite</span>
              <span className="text-[10px] text-slate-500 leading-tight">Insert or manage<br/>citations</span>
            </button>
          </div>
          
          <div className="mt-8 pt-6 border-t border-border-light">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[13px] font-bold text-[#0B1628] flex items-center">
                Context <svg className="ml-1 opacity-50" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
              </h4>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-slate-500">Selected text (1 paragraph)</span>
                  <button className="text-[11px] text-[#4E75C4] font-medium hover:underline">Clear</button>
                </div>
                <p className="text-[12px] text-slate-600 bg-[#F8FAFC] p-3 rounded-lg border border-border-light italic line-clamp-3">
                  "Gas flaring has remained one of the country's most persistent energy challenges, driven by inadequate infrastructure, regulatory gaps, and economic disincentives..."
                </p>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border-light/50">
                <div className="flex items-center space-x-2">
                  <span className="w-4 h-4 flex items-center justify-center border border-slate-300 rounded-full text-slate-400">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                  </span>
                  <span className="text-[12px] font-medium text-[#0B1628]">Relevant sources</span>
                  <span className="bg-[#E2E8F0] text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">3</span>
                </div>
                <svg className="opacity-50" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border-light/50">
                <div className="flex items-center space-x-2">
                  <span className="w-4 h-4 flex items-center justify-center border border-slate-300 rounded-full text-slate-400">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                  </span>
                  <span className="text-[12px] font-medium text-[#0B1628]">Related topics</span>
                  <span className="bg-[#E2E8F0] text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">5</span>
                </div>
                <svg className="opacity-50" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>

            <div className="mt-6 flex items-start gap-2 bg-[#FFFbeb] p-3 rounded-lg border border-[#FDE68A]">
              <span className="text-[#D97706] mt-0.5">💡</span>
              <p className="text-[11px] text-[#92400E] leading-relaxed">
                <span className="font-bold">Tip:</span> Select text in your document to get contextual help, find evidence, or add citations.
              </p>
            </div>
          </div>
          
        </div>
      </div>
    );
  }

  if (isAnalyzed && issuesCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white">
        <Check className="w-10 h-10 mb-4 text-status-success" />
        <h3 className="text-[15px] font-semibold text-[#0B1628] mb-2">Analysis complete</h3>
        <p className="text-[14px] text-foreground-secondary leading-relaxed max-w-[240px]">
          No writing issues were found.
        </p>
      </div>
    );
  }

  if (!issue) {
    const openIssues = issues.filter(i => i.status === 'open' || i.status === 'pending');
    if (openIssues.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white">
          <Check className="w-10 h-10 mb-4 text-status-success" />
          <h3 className="text-[15px] font-semibold text-[#0B1628] mb-2">Analysis complete</h3>
          <p className="text-[14px] text-foreground-secondary leading-relaxed max-w-[240px]">
            No writing issues were found.
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full bg-white relative">
        <div className="flex items-center justify-between p-4 border-b border-border-light bg-white sticky top-0 z-10 shrink-0">
          <h3 className="text-[14px] font-semibold text-[#0B1628]">
            {openIssues.length} writing {openIssues.length === 1 ? 'issue' : 'issues'}
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {openIssues.map(i => {
            const formatType = (type: string) => type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            const activeSug = i.suggestions.find(s => s.status === 'pending') || i.suggestions[i.suggestions.length - 1];
            return (
              <button
                key={i.id}
                onClick={() => onIssueSelect && onIssueSelect(i.id)}
                className="w-full text-left p-4 bg-white border border-border-light rounded-lg shadow-sm hover:border-accent hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-accent uppercase tracking-wider">{formatType(i.issue_type)}</span>
                </div>
                <p className="text-[14px] text-[#0B1628] font-medium leading-relaxed mb-2 line-clamp-3">
                  &ldquo;{i.original_text}&rdquo;
                </p>
                {activeSug && (
                  <p className="text-[13px] text-foreground-secondary leading-relaxed line-clamp-2">
                    Suggestion: {activeSug.suggested_text}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const activeSuggestion = issue.suggestions.find(s => s.status === 'pending') || issue.suggestions[issue.suggestions.length - 1];

  const handleTryAnother = async () => {
    try {
      setLoadingAlternative(true);
      const res = await fetch('/api/analyze/alternative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          blockId,
          issueId: issue.id,
          paragraphText
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.suggestion) {
          issue.suggestions.push(data.suggestion);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAlternative(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditText(activeSuggestion?.suggested_text || issue.original_text);
  };

  const handleSaveEdit = () => {
    if (!activeSuggestion) return;
    onSuggestionAction(issue.id, activeSuggestion.id, 'manually_edited', editText);
    setIsEditing(false);
  };

  const formatIssueType = (type: string) => type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex items-center justify-between p-4 border-b border-border-light bg-white sticky top-0 z-10 shrink-0">
        <h3 className="text-[13px] font-semibold text-[#0B1628] uppercase tracking-wider">
          {formatIssueType(issue.issue_type)}
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-background-secondary rounded text-foreground-secondary hover:text-[#0B1628] transition-colors">
          <X size={16} />
        </button>
      </div>
      
      <div className="p-5 flex-1 overflow-y-auto space-y-7">
        
        {/* Original */}
        <div>
          <h4 className="text-[11px] font-semibold text-foreground-secondary uppercase tracking-wider mb-2">Original</h4>
          <p className="text-[14px] text-ink bg-[#FEF0C7]/30 border border-[#FEF0C7] p-3 rounded-md line-through decoration-[#F59E0B]/50 leading-relaxed">
            {issue.original_text}
          </p>
        </div>

        {/* Suggested */}
        <div>
          <h4 className="text-[11px] font-semibold text-foreground-secondary uppercase tracking-wider mb-2">Suggested</h4>
          {isEditing ? (
            <div className="space-y-2">
              <textarea 
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full min-h-[100px] text-[14px] text-ink border border-accent rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-accent leading-relaxed bg-white"
              />
              <div className="flex justify-end space-x-2">
                <button onClick={() => setIsEditing(false)} className="text-[12px] font-medium px-3 py-1.5 text-foreground-secondary hover:bg-background-secondary rounded transition-colors">Cancel</button>
                <button onClick={handleSaveEdit} className="text-[12px] font-medium px-3 py-1.5 bg-accent text-white rounded hover:bg-accent-hover transition-colors">Save Edit</button>
              </div>
            </div>
          ) : (
            <div className="group relative">
              <p className="text-[14px] text-ink bg-status-success/10 border border-status-success/20 p-3 rounded-md leading-relaxed">
                {activeSuggestion?.suggested_text}
              </p>
              <button 
                onClick={handleEdit}
                className="absolute top-2 right-2 p-1.5 bg-white shadow-sm border border-border-light rounded text-foreground-secondary opacity-0 group-hover:opacity-100 transition-opacity hover:text-accent"
                title="Edit suggestion"
              >
                <Edit2 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Explanation */}
        <div>
          <h4 className="text-[11px] font-semibold text-foreground-secondary uppercase tracking-wider mb-2">Why</h4>
          <p className="text-[13px] text-foreground-secondary leading-relaxed bg-background-pale p-3 rounded-md border border-border-light">
            {activeSuggestion?.explanation || issue.explanation}
          </p>
        </div>

        {/* Protected Items Checklist */}
        <div>
           <h4 className="text-[11px] font-semibold text-foreground-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
             <ShieldCheck size={14} className="text-foreground-secondary" /> Protected
           </h4>
           <ul className="text-[13px] text-foreground-secondary space-y-1.5">
             <li className="flex items-center gap-2"><Check size={14} className="text-status-success" /> <span className="text-[#0B1628]">Meaning preserved</span></li>
             <li className="flex items-center gap-2"><Check size={14} className="text-status-success" /> <span className="text-[#0B1628]">Numbers & Units</span></li>
             <li className="flex items-center gap-2"><Check size={14} className="text-status-success" /> <span className="text-[#0B1628]">Citations</span></li>
           </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border-light bg-white shrink-0 space-y-3 z-10">
        <div className="flex space-x-2">
          <button 
            onClick={() => activeSuggestion && onSuggestionAction(issue.id, activeSuggestion.id, 'rejected')}
            className="flex-1 h-[36px] bg-white border border-border-light text-[#0B1628] rounded-md hover:bg-background-secondary transition-colors text-[13px] font-medium"
          >
            Reject
          </button>
          <button 
            onClick={() => activeSuggestion && onSuggestionAction(issue.id, activeSuggestion.id, 'accepted')}
            className="flex-1 h-[36px] bg-accent text-white rounded-md hover:bg-accent-hover transition-colors text-[13px] font-medium"
          >
            Accept
          </button>
        </div>
        <button 
          onClick={handleTryAnother}
          disabled={loadingAlternative}
          className="w-full flex items-center justify-center space-x-2 h-[36px] text-foreground-secondary hover:bg-background-secondary rounded-md transition-colors text-[13px] font-medium disabled:opacity-50"
        >
          {loadingAlternative ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          <span>Try Another</span>
        </button>
      </div>
    </div>
  );
}
