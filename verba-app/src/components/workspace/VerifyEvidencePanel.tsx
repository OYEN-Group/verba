import { useState, useEffect } from 'react';
import { Loader2, FileText, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { CitationIntegrityResult } from '@/lib/citations/integrity';
import { ClaimSupportStatus } from '@/lib/citations/claimSupport';
import { EvidencePassage } from '@/lib/citations/evidence';

type VerifyState = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'results'; supportStatus: ClaimSupportStatus; conversationalResponse: string; passages: EvidencePassage[]; method: string }
  | { status: 'error'; errorMsg: string };

export function VerifyEvidencePanel({
  citationId,
  contextText,
  workId,
  result,
}: {
  citationId: string;
  contextText: string;
  workId: string;
  result: CitationIntegrityResult;
}) {
  const [state, setState] = useState<VerifyState>({ status: 'idle' });

  useEffect(() => {
    let active = true;
    const fetchExisting = async () => {
      try {
        const res = await fetch(`/api/works/${workId}/citations/${citationId}/evidence/verify?claimText=${encodeURIComponent(contextText)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (active && data.status && data.status !== 'not_checked' && data.status !== 'unclear') {
          setState({
            status: 'results',
            supportStatus: data.status,
            conversationalResponse: data.conversationalResponse || '',
            passages: data.passages || [],
            method: data.method || 'full_text'
          });
        }
      } catch (e) {
        // ignore errors on mount fetch
      }
    };
    fetchExisting();
    return () => { active = false; };
  }, [citationId, workId]);

  const runVerification = async () => {
    setState({ status: 'loading' });
    try {
      const res = await fetch(`/api/works/${workId}/citations/${citationId}/evidence/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateClaimText: contextText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setState({ 
        status: 'results', 
        supportStatus: data.status, 
        conversationalResponse: data.conversationalResponse, 
        passages: data.passages,
        method: data.method 
      });
    } catch (e: any) {
      setState({ status: 'error', errorMsg: e.message });
    }
  };

  if (state.status === 'idle') {
    return (
      <button
        onClick={runVerification}
        className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
      >
        <FileText size={11} /> Check source evidence
      </button>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-[11px] text-foreground-secondary p-2 bg-black/5 rounded">
        <Loader2 size={12} className="animate-spin text-accent shrink-0" />
        Reading source content...
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="text-[11px] text-status-error p-2 bg-status-error/10 rounded">
        <p>{state.errorMsg}</p>
        <button onClick={runVerification} className="mt-1 underline">Try again</button>
      </div>
    );
  }

  // Results
  const isSupported = state.supportStatus === 'supported';
  const isRelated = state.supportStatus === 'related';
  const isPartial = state.supportStatus === 'partially_supported';
  
  return (
    <div className="space-y-3 mt-2 bg-[#F6F8FB] border border-border-light rounded-lg p-3 relative">
       <div className="absolute -top-2 -left-2 w-4 h-4 bg-accent text-white rounded-full flex items-center justify-center shadow">
          <FileText size={8} />
       </div>
       
       <div className="pl-2">
         <p className="text-[12px] font-medium text-[#0B1628] leading-snug">
            {state.conversationalResponse}
         </p>
         
         {state.passages && state.passages.length > 0 && (
            <div className="mt-3 space-y-2 border-l-2 border-border-light pl-3">
               {state.passages.map((p, i) => (
                  <div key={i} className="text-[11px] text-foreground-secondary leading-relaxed">
                     {p.section && <span className="block text-[9px] uppercase font-bold text-foreground-muted mb-0.5">{p.section}</span>}
                     <span className="italic">"{p.text}"</span>
                     {p.sourceUrl && (
                       <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-accent hover:underline inline-flex items-center gap-0.5">
                         <ExternalLink size={10} /> source
                       </a>
                     )}
                  </div>
               ))}
            </div>
         )}
         
         <div className="mt-3 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${isSupported ? 'bg-[#ECFDF3] text-[#027A48]' : isPartial ? 'bg-[#FFFAEB] text-[#B54708]' : isRelated ? 'bg-black/5 text-foreground-secondary' : 'bg-status-error/10 text-status-error'}`}>
               <CheckCircle size={10} /> {state.supportStatus.replace('_', ' ')}
            </span>
            <span className="text-[10px] text-foreground-muted uppercase">Verified via {state.method}</span>
         </div>
       </div>
    </div>
  );
}
