import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState } from 'react';
import { TocEntry } from './TableOfContents';
import { RefreshCw } from 'lucide-react';

export function TableOfContentsView(props: NodeViewProps) {
  const { node, updateAttributes, editor } = props;
  const entries: TocEntry[] = node.attrs.entries || [];
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = () => {
    setIsUpdating(true);
    
    // We need to defer this slightly so any pending layouts finish
    setTimeout(() => {
      const newEntries: TocEntry[] = [];
      const json = editor.getJSON();
      
      const walk = (n: any) => {
        if (n.type === 'heading' && n.attrs?.verbaBlockId) {
          const id = n.attrs.verbaBlockId;
          const text = (n.content || []).map((c: any) => c.text || '').join('');
          const level = n.attrs.level || 1;
          
          // Find the page number
          let pageNumber = 1;
          const element = document.querySelector(`[data-verba-block-id="${id}"]`);
          if (element) {
            const pageEl = element.closest('.verba-page');
            if (pageEl) {
              const pages = Array.from(document.querySelectorAll('.verba-page'));
              pageNumber = pages.indexOf(pageEl) + 1;
            }
          }
          
          // Exclude Title and Subtitle from standard TOC if they use verbaStyle?
          // The prompt example just shows chapter 1... Let's just include all headings for now, or filter by level if needed.
          // Wait, if it has verbaStyle "title" or "subtitle", it's probably not in the TOC.
          if (n.attrs.verbaStyle !== 'title' && n.attrs.verbaStyle !== 'subtitle') {
            newEntries.push({ id, text, level, pageNumber });
          }
        }
        if (Array.isArray(n.content)) {
          n.content.forEach((child: any) => walk(child));
        }
      };
      
      walk(json);
      
      updateAttributes({ entries: newEntries });
      setIsUpdating(false);
    }, 100);
  };

  const handleNavigate = (id: string) => {
    const node = document.querySelector(`[data-verba-block-id="${id}"]`);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <NodeViewWrapper className="verba-toc my-8 border border-border-light rounded-md p-6 bg-white shadow-sm" contentEditable={false}>
      <div className="flex items-center justify-between mb-6 border-b border-border-light pb-2">
        <h2 className="text-xl font-serif font-bold text-[#0B1628] m-0">Table of Contents</h2>
        <button 
          onClick={handleUpdate} 
          disabled={isUpdating}
          className="flex items-center gap-1.5 text-[12px] font-medium text-foreground-secondary hover:text-[#0B1628] px-2 py-1 rounded hover:bg-black/5 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={isUpdating ? 'animate-spin' : ''} />
          <span>Update Table</span>
        </button>
      </div>
      
      {entries.length === 0 ? (
        <div className="text-[13px] text-foreground-muted italic text-center py-4">
          Click "Update Table" to generate the table of contents.
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry, i) => (
            <div 
              key={`${entry.id}-${i}`} 
              className="flex items-end justify-between group cursor-pointer hover:bg-black/5 rounded px-2 py-1 -mx-2 transition-colors"
              onClick={() => handleNavigate(entry.id)}
            >
              <div 
                className="flex-1 overflow-hidden"
                style={{ paddingLeft: `${(entry.level - 1) * 1.5}rem` }}
              >
                <div className="flex items-baseline w-full">
                  <span className={`truncate ${entry.level === 1 ? 'font-bold text-[#0B1628]' : 'text-foreground-secondary'}`}>
                    {entry.text || 'Untitled'}
                  </span>
                  <div className="flex-1 mx-2 border-b border-dotted border-border-light relative top-[-4px] group-hover:border-slate-400 transition-colors opacity-50" />
                </div>
              </div>
              <span className={`shrink-0 ml-2 ${entry.level === 1 ? 'font-bold text-[#0B1628]' : 'text-foreground-secondary'}`}>
                {entry.pageNumber}
              </span>
            </div>
          ))}
        </div>
      )}
    </NodeViewWrapper>
  );
}
