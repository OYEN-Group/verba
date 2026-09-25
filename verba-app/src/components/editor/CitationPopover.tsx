import React, { useState, useEffect, useRef } from 'react';
import { useCitationContext } from '../workspace/CitationContext';
import { formatBibliographyEntry } from '@/lib/citations/formatter';
import { Search, BookOpen, Loader2 } from 'lucide-react';
import { Editor } from '@tiptap/react';

interface CitationPopoverProps {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
}

export function CitationPopover({ editor, isOpen, onClose, documentId }: CitationPopoverProps) {
  const { sources, style } = useCitationContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const filteredSources = sources.filter(s => 
    !searchQuery || 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.authors.some(a => a.family.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
        editor.commands.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, editor, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleInsert = async (sourceId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/citations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_source_id: sourceId })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to insert citation');
      
      const { citationId } = data;
      const { from, to } = editor.state.selection;
      
      editor.commands.insertContentAt(to, {
        type: 'citation',
        attrs: { citationId, sourceId }
      });
      editor.commands.insertContentAt(to + 1, ' ');
      
      fetch(`/api/documents/${documentId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'citation_inserted',
          metadata: { citationId, sourceId, title: sources.find(s => s.id === sourceId)?.title }
        })
      });

      onClose();
      editor.commands.focus();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Calculate position
  const { view } = editor;
  const { from } = view.state.selection;
  const coords = view.coordsAtPos(from);
  const editorRect = view.dom.getBoundingClientRect();
  
  // Position slightly below the cursor
  const top = coords.bottom - editorRect.top + 5;
  const left = coords.left - editorRect.left;

  return (
    <div 
      ref={containerRef}
      className="absolute z-50 bg-white border border-border-light shadow-xl rounded-lg w-[360px] flex flex-col font-sans"
      style={{ top: `${top}px`, left: `${left}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-2 border-b border-border-light flex items-center bg-[#F8FAFC] rounded-t-lg">
        <Search size={14} className="text-foreground-muted ml-1" />
        <input 
          autoFocus
          className="w-full bg-transparent border-none focus:outline-none text-[13px] px-2 text-[#0B1628] placeholder-foreground-muted"
          placeholder="Search sources to cite..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {loading && <Loader2 size={14} className="animate-spin text-accent mr-1" />}
      </div>
      <div className="max-h-[240px] overflow-y-auto p-1 bg-white rounded-b-lg">
        {filteredSources.length > 0 ? (
          <div className="space-y-1">
            {filteredSources.map(source => (
              <button 
                key={source.id}
                onClick={() => source.id && handleInsert(source.id)}
                className="w-full text-left p-2 hover:bg-black/5 rounded group flex items-start gap-2 transition-colors"
              >
                <BookOpen size={14} className="text-foreground-muted mt-0.5 shrink-0 group-hover:text-accent transition-colors" />
                <div>
                  <div className="text-[13px] font-medium text-[#0B1628] leading-tight line-clamp-1 mb-0.5 group-hover:text-accent">
                    {source.title}
                  </div>
                  <div className="text-[11px] text-foreground-secondary leading-snug line-clamp-2 opacity-80">
                    {formatBibliographyEntry(source, style, undefined)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-[12px] text-foreground-muted">
            No sources found matching "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
}
