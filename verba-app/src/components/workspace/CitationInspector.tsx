import React from 'react';
import { useCitationContext } from './CitationContext';
import { evaluateCitationIntegrity } from '@/lib/citations/integrity';
import { ShieldCheck, ShieldAlert, AlertTriangle, HelpCircle, ExternalLink, Activity, BookOpen, CheckCircle, X } from 'lucide-react';

interface CitationInspectorProps {
  citationId: string;
  sourceId: string;
  contextText: string;
  onClose: () => void;
  onCheckCitation?: () => void;
  onViewSource?: () => void;
  style?: React.CSSProperties;
}

export function CitationInspector({ citationId, sourceId, contextText, onClose, onCheckCitation, onViewSource, style }: CitationInspectorProps) {
  const { sources, style: citeStyle } = useCitationContext();

  const source = sources.find(s => s.id === sourceId);
  const result = evaluateCitationIntegrity(citationId, sourceId, sources, citeStyle, contextText);

  const authorsStr = source?.authors.length 
    ? source.authors.slice(0, 2).map(a => a.family).join(', ') + (source.authors.length > 2 ? ' et al.' : '') 
    : null;

  const renderIntegrityIcon = () => {
    if (!source) return <AlertTriangle size={14} className="text-status-error" />;
    if (result.overall === 'healthy') return <ShieldCheck size={14} className="text-status-success" />;
    if (result.overall === 'needs_review') return <AlertTriangle size={14} className="text-status-warning" />;
    if (result.overall === 'critical') return <ShieldAlert size={14} className="text-status-error" />;
    return <HelpCircle size={14} className="text-foreground-muted" />;
  };

  const getClaimSupportLabel = (status: string) => {
    switch(status) {
      case 'supported': return { label: 'Supported', color: 'text-status-success' };
      case 'partially_supported': return { label: 'Worth checking', color: 'text-status-warning' };
      case 'possibly_contradicted': return { label: 'Contradicted', color: 'text-status-error' };
      case 'insufficient_evidence': return { label: 'Worth checking', color: 'text-status-warning' };
      default: return { label: 'Not checked', color: 'text-foreground-muted' };
    }
  };

  const getIdentityLabel = (status: string) => {
    switch(status) {
      case 'confirmed': return { label: 'Confirmed', color: 'text-status-success' };
      case 'partial': return { label: 'Partial', color: 'text-status-warning' };
      case 'conflict': return { label: 'Conflict', color: 'text-status-error' };
      default: return { label: 'Unverified', color: 'text-foreground-muted' };
    }
  };

  const claimInfo = getClaimSupportLabel(result.claimSupport.status);
  const identityInfo = getIdentityLabel(result.sourceIdentity.status);
  const evidenceStatus = result.evidenceAvailability.status === 'full_text_location_available' ? 'Open Access' 
                       : result.evidenceAvailability.status === 'abstract_available' ? 'Abstract checked' 
                       : 'Not checked';

  return (
    <div 
      className="absolute z-[100] bg-white border border-border-light shadow-2xl rounded-lg w-[320px] flex flex-col text-[13px] font-sans"
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex justify-between items-start p-3 pb-2 border-b border-border-light">
        <div className="flex flex-col gap-1 pr-4">
          <div className="font-semibold text-[#0B1628] leading-tight">
            {source ? (authorsStr ? `${authorsStr}, ${source.publication_year}` : source.title) : 'Unknown Source'}
          </div>
          {source && (
            <div className="text-[12px] text-foreground-secondary leading-snug line-clamp-2 italic">
              {source.title}
            </div>
          )}
          {source && (
            <div className="text-[11px] text-foreground-muted mt-0.5">
              {source.container_title || 'Unknown Publication'} {source.publication_year ? `(${source.publication_year})` : ''}
            </div>
          )}
        </div>
        <button onClick={onClose} className="text-foreground-muted hover:text-foreground">
          <X size={14} />
        </button>
      </div>

      {/* Integrity Summary */}
      {source && (
        <div className="p-3 bg-[#F9FAFB] flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-foreground-secondary text-[12px]">Identity</span>
            <span className={`font-medium text-[12px] ${identityInfo.color}`}>{identityInfo.label}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-foreground-secondary text-[12px]">Evidence</span>
            <span className="font-medium text-[12px] text-foreground">{evidenceStatus}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-foreground-secondary text-[12px]">Claim support</span>
            <span className={`font-medium text-[12px] ${claimInfo.color}`}>{claimInfo.label}</span>
          </div>

          {result.primaryReason && (
            <div className="mt-2 pt-2 border-t border-border-light text-[12px]">
              <span className={`font-medium ${result.primaryReason.severity === 'critical' ? 'text-status-error' : 'text-status-warning'} flex items-center gap-1.5`}>
                <AlertTriangle size={12} /> {result.primaryReason.shortMessage}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-2 border-t border-border-light flex gap-2">
        <button 
          onClick={onViewSource}
          className="flex-1 px-3 py-1.5 text-[12px] font-medium text-[#0B1628] bg-black/5 hover:bg-black/10 rounded transition-colors"
        >
          View source
        </button>
        {result.claimSupport.status === 'not_checked' && onCheckCitation && (
          <button 
            onClick={onCheckCitation}
            className="flex-1 px-3 py-1.5 text-[12px] font-medium text-white bg-accent hover:bg-accent-hover rounded transition-colors flex items-center justify-center gap-1.5"
          >
            Check citation
          </button>
        )}
      </div>
    </div>
  );
}
