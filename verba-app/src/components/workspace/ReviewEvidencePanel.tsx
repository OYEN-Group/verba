import React, { useState, useEffect } from 'react';
import { Loader2, FileText, CheckCircle, AlertTriangle, ExternalLink, Search, RefreshCw } from 'lucide-react';
import { ContextualSelection } from '../DocumentEditor';

interface ClaimResult {
  claimText: string;
  type: string;
  checkability: string;
  missingCitation: boolean;
  associatedCitationId?: string;
  status: string;
  conversationalResponse: string;
  passages: any[];
  method?: string;
}

interface Props {
  workId: string;
  documentId: string;
  selection: ContextualSelection | null;
  onFindEvidence: (text: string) => void;
  onClearSelection: () => void;
}

export function ReviewEvidencePanel({ workId, documentId, selection, onFindEvidence, onClearSelection }: Props) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ClaimResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runReview = async (currentSelection: ContextualSelection) => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      if (!workId) {
        throw new Error("This document must be saved to a Workspace before you can review evidence.");
      }
      
      const res = await fetch(`/api/works/${workId}/documents/${documentId}/evidence/review-selection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectionText: currentSelection.originalText,
          blockId: currentSelection.blockId,
          associatedCitations: currentSelection.associatedCitations || []
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        throw new Error(data?.error || 'Failed to review evidence. The server returned an invalid response.');
      }
      setResults(data.results || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selection) {
      runReview(selection);
    }
  }, [selection, workId, documentId]);

  if (!selection) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F9FAFB] text-center">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
          <ShieldCheck size={24} className="text-accent" />
        </div>
        <h3 className="text-[14px] font-semibold text-[#0B1628] mb-1">Review Evidence</h3>
        <p className="text-[12px] text-foreground-secondary leading-relaxed max-w-[200px]">
          Select text in the editor and click "Review Evidence" to verify claims and check for missing citations.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="p-4 border-b border-border-light bg-[#F9FAFB] flex justify-between items-center shrink-0">
        <h3 className="text-[13px] font-semibold text-[#0B1628]">Reviewing Selection</h3>
        <button 
          onClick={onClearSelection}
          className="text-[11px] text-foreground-muted hover:text-[#0B1628] underline"
        >
          Clear
        </button>
      </div>
      
      <div className="p-4 border-b border-border-light shrink-0">
        <p className="text-[12px] italic text-foreground-secondary border-l-2 border-border-light pl-3">
          "{selection.originalText.slice(0, 150)}{selection.originalText.length > 150 ? '...' : ''}"
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center p-8 text-foreground-secondary">
            <Loader2 size={24} className="animate-spin text-accent mb-2" />
            <p className="text-[12px]">Analyzing claims...</p>
          </div>
        )}

        {error && (
          <div className="text-[12px] text-status-error p-3 bg-status-error/10 rounded border border-status-error/20">
            <p className="font-semibold mb-1">Analysis Failed</p>
            <p>{error}</p>
            <button onClick={() => runReview(selection)} className="mt-2 flex items-center gap-1 underline hover:no-underline">
              <RefreshCw size={12} /> Try again
            </button>
          </div>
        )}

        {results && results.length === 0 && (
          <p className="text-[12px] text-foreground-secondary text-center p-4">No specific factual claims detected in this selection.</p>
        )}

        {results && results.map((result, idx) => {
          const isSupported = result.status === 'supported';
          const isRelated = result.status === 'related';
          const isPartial = result.status === 'partially_supported';
          const isProblem = result.status === 'possibly_contradicted' || result.status === 'insufficient_evidence';

          if (result.missingCitation && result.checkability === 'checkable_claim') {
            return (
              <div key={idx} className="bg-[#FFFAEB] border border-[#FDE272] rounded-lg p-3 relative space-y-2">
                 <div className="absolute -top-2 -left-2 w-4 h-4 bg-[#B54708] text-white rounded-full flex items-center justify-center shadow">
                    <AlertTriangle size={8} />
                 </div>
                 <p className="text-[12px] font-medium text-[#0B1628] leading-snug ml-2">
                    {result.claimText}
                 </p>
                 <div className="ml-2 mt-2 p-2 bg-white rounded border border-[#FDE272]/50">
                    <p className="text-[11px] text-[#B54708] mb-2">{result.conversationalResponse}</p>
                    <button
                      onClick={() => onFindEvidence(result.claimText)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-[#B54708] text-white rounded hover:bg-[#933706] transition-colors"
                    >
                      <Search size={12} /> Find Evidence
                    </button>
                 </div>
              </div>
            );
          }

          if (result.status === 'not_checkable') {
             return (
               <div key={idx} className="bg-[#F6F8FB] border border-border-light rounded-lg p-3 relative">
                 <p className="text-[12px] text-foreground-secondary leading-snug ml-2 italic">
                    "{result.claimText}"
                 </p>
                 <p className="text-[11px] text-foreground-muted ml-2 mt-1">{result.conversationalResponse}</p>
               </div>
             );
          }

          return (
            <div key={idx} className="bg-[#F6F8FB] border border-border-light rounded-lg p-3 relative space-y-3">
               <div className="absolute -top-2 -left-2 w-4 h-4 bg-accent text-white rounded-full flex items-center justify-center shadow">
                  <FileText size={8} />
               </div>
               
               <div className="pl-2">
                 <p className="text-[12px] font-medium text-[#0B1628] leading-snug mb-2">
                    {result.claimText}
                 </p>
                 
                 <div className="p-2 bg-white rounded border border-border-light">
                   <p className="text-[11px] text-foreground-secondary leading-relaxed">
                      {result.conversationalResponse}
                   </p>
                   
                   {result.passages && result.passages.length > 0 && (
                      <div className="mt-2 space-y-1.5 border-l-2 border-border-light pl-2">
                         {result.passages.map((p, i) => (
                            <div key={i} className="text-[10px] text-foreground-muted leading-relaxed">
                               {p.section && <span className="block text-[9px] uppercase font-bold text-foreground-muted mb-0.5">{p.section}</span>}
                               <span className="italic">"{p.text}"</span>
                               {p.sourceUrl && (
                                 <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-accent hover:underline inline-flex items-center gap-0.5">
                                   <ExternalLink size={8} />
                                 </a>
                               )}
                            </div>
                         ))}
                      </div>
                   )}
                   
                   <div className="mt-2 pt-2 border-t border-border-light flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${isSupported ? 'bg-[#ECFDF3] text-[#027A48]' : isPartial ? 'bg-[#FFFAEB] text-[#B54708]' : isRelated ? 'bg-black/5 text-foreground-secondary' : 'bg-status-error/10 text-status-error'}`}>
                         <CheckCircle size={8} /> {result.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {result.method && (
                         <span className="text-[9px] text-foreground-muted uppercase">Via {result.method}</span>
                      )}
                   </div>
                 </div>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Temporary import placeholder so it doesn't break
import { ShieldCheck } from 'lucide-react';
