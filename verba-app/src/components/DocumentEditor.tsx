'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { EditorToolbar } from './EditorToolbar';
import { DocumentRuler } from './workspace/DocumentRuler';
import { VerbaBlockId, IssueHighlight, IssueProp } from './editor/EditorExtensions';
import { Citation } from './editor/extensions/Citation';
import { Sparkles, Search, ShieldCheck, BookOpen } from 'lucide-react';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Document from '@tiptap/extension-document';
import { VerbaImage } from './editor/extensions/VerbaImage';
import { Figure } from './editor/extensions/Figure';
import { Section } from './editor/extensions/Section';
import { PageBreak } from './editor/extensions/PageBreak';
import { LineHeight } from './editor/extensions/LineHeight';
import { ParagraphFormat } from './editor/extensions/ParagraphFormat';
import FontFamily from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { FontSize } from './editor/extensions/FontSize';
import CharacterCount from '@tiptap/extension-character-count';
import { MathEquation } from './editor/extensions/MathEquation';
import SearchAndReplace from '@sereneinserenade/tiptap-search-and-replace';
import { PageLayout } from './editor/extensions/PageLayout';
import { usePageLayout } from '@/hooks/usePageLayout';
import { CitationPopover } from './editor/CitationPopover';
import { VerbaStyle } from './editor/extensions/VerbaStyle';
import { TableOfContents } from './editor/extensions/TableOfContents';
import { Caption } from './editor/extensions/Caption';
import { CommandPalette } from './workspace/CommandPalette';

export interface ContextualSelection {
  blockId: string;
  paragraphText: string;
  originalText: string;
  startOffset: number;
  endOffset: number;
  associatedCitations?: string[];
}

/** A parsed block from docx_processor / parsed_content */
interface Block {
  id: string;
  type: string;
  style: string;
  level?: number;
  text?: string;
  runs?: { text: string; bold: boolean; italic: boolean }[];
}

/** Tiptap JSON document node — used when loading from editor_state */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TiptapJson = Record<string, any>;

interface SectionData {
  id: string;
  layout: { type: string; columns: number };
  blocks: Block[];
}

interface DocumentEditorProps {
  /** Parsed sections from parsed_content — used only when no editor_state exists */
  initialSections?: SectionData[];
  /** Parsed blocks from parsed_content (legacy) */
  initialBlocks?: Block[];
  /** Tiptap JSON from editor_state — takes priority over initialBlocks */
  initialEditorJson?: TiptapJson | null;
  isEditable?: boolean;
  zoomLevel?: number;
  issues?: IssueProp[];
  selectedIssueId?: string | null;
  onIssueSelect?: (issueId: string | null) => void;
  onEditorReady?: (editor: Editor) => void;
  /** Called with the latest Tiptap JSON whenever the document changes (for autosave) */
  onUpdate?: (json: TiptapJson, wordCount: number, characterCount: number) => void;
  onAskVerba?: (selection: ContextualSelection) => void;
  onFindEvidence?: (selection: ContextualSelection) => void;
  onReviewEvidence?: (selection: ContextualSelection) => void;
  onCite?: (selection: ContextualSelection) => void;
  onCitationClick?: (citationId: string, sourceId: string, contextText: string, rect: DOMRect) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  viewMode?: 'print' | 'web';
  onPageCountChange?: (count: number) => void;
  onCurrentPageChange?: (page: number) => void;
}

/**
 * Convert parser sections into HTML that Tiptap can ingest.
 * Used ONLY for the initial load when editor_state is NULL.
 * Preserves the original parsed block IDs via data-verba-block-id.
 */
const sectionsToHtml = (sections: SectionData[]): string => {
  return sections.map(section => {
    const blocksHtml = (section.blocks || [])
      .map(block => {
        if (block.type === 'pageBreak') {
          return `<hr class="page-break" />`;
        }
        
        if (block.type === 'table') {
          // block.rows -> cells
          // @ts-expect-error - temporary dynamic type
          const rowsHtml = (block.rows || []).map(row => {
            // @ts-expect-error
            const cellsHtml = (row.cells || []).map(cell => {
              const cellTag = row.type === 'table-header' ? 'th' : 'td';
              return `<${cellTag}><p>${(cell.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p></${cellTag}>`;
            }).join('');
            return `<tr>${cellsHtml}</tr>`;
          }).join('');
          return `<table data-verba-block-id="${block.id}"><tbody>${rowsHtml}</tbody></table>`;
        }

        let content = '';
        if (block.runs && block.runs.length > 0) {
          content = block.runs
            .map(run => {
              // @ts-expect-error
              if (run.type === 'image') {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://poaclxtaacguolfeefcd.supabase.co';
                // @ts-expect-error
                return `<img src="${supabaseUrl}/storage/v1/object/public/documents/${run.storagePath}" data-storage-path="${run.storagePath}" alt="Imported image" />`;
              }
              let text = run.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
              if (run.bold) text = `<strong>${text}</strong>`;
              if (run.italic) text = `<em>${text}</em>`;
              return text;
            })
            .join('');
        } else {
          content = (block.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        if (block.type === 'heading') {
          const level = Math.min(Math.max(block.level || 1, 1), 6);
          return `<h${level} data-verba-block-id="${block.id}">${content}</h${level}>`;
        }
        return `<p data-verba-block-id="${block.id}">${content}</p>`;
      })
      .join('');
      
    const columns = section.layout?.columns || 1;
    return `<section data-columns="${columns}" class="verba-section">${blocksHtml}</section>`;
  }).join('');
};

const CustomDocument = Document.extend({
  content: 'section+',
});

export function DocumentEditor({
  initialSections,
  initialBlocks,
  initialEditorJson,
  isEditable = true,
  zoomLevel = 100,
  issues = [],
  selectedIssueId = null,
  onIssueSelect = () => {},
  onEditorReady,
  onUpdate,
  onAskVerba,
  onFindEvidence,
  onReviewEvidence,
  onCite,
  onCitationClick,
  onFocus,
  onBlur,
  viewMode = 'web',
  onPageCountChange,
  onCurrentPageChange,
}: DocumentEditorProps) {
  const [mounted, setMounted] = useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [showCitationPopover, setShowCitationPopover] = useState(false);

  useEffect(() => {
    const handleOpenCiteInline = () => setShowCitationPopover(true);
    window.addEventListener('verba:open-cite-inline', handleOpenCiteInline);
    return () => window.removeEventListener('verba:open-cite-inline', handleOpenCiteInline);
  }, []);

  const editor = useEditor({
    extensions: [
      CustomDocument,
      StarterKit.configure({
        document: false, // disable default document
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Section,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      VerbaImage.configure({
        allowBase64: true,
        inline: true,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Figure,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Underline,
      Subscript,
      Superscript,
      PageBreak,
      VerbaBlockId,
      VerbaStyle,
      TableOfContents,
      Caption,
      IssueHighlight.configure({
        issues,
        selectedIssueId,
        onIssueSelect,
      }),
      Citation,
      FontFamily,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontSize,
      LineHeight,
      ParagraphFormat,
      CharacterCount,
      MathEquation,
      SearchAndReplace.configure({
        searchResultClass: 'search-result',
      }),
      PageLayout,
    ],
    content: '',
    editable: isEditable,
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[1000px]',
      },
      handlePaste: (view, event, slice) => {
        // Handle Image Pastes
        if (event.clipboardData && event.clipboardData.files && event.clipboardData.files.length > 0) {
          const file = event.clipboardData.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            const docIdMatch = window.location.pathname.match(/\/workspace\/([^/]+)/);
            if (docIdMatch && docIdMatch[1]) {
              const docId = docIdMatch[1];
              // Optimistically insert a placeholder or just upload directly
              import('@/lib/supabase/client').then(({ createClient }) => {
                const supabase = createClient();
                supabase.auth.getUser().then(({ data: { user } }) => {
                  if (user) {
                    const ext = file.name.split('.').pop() || 'png';
                    const assetId = `img_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                    const storagePath = `${user.id}/${docId}/assets/${assetId}`;
                    
                    supabase.storage.from('documents').upload(storagePath, file)
                      .then(({ data, error }) => {
                        if (!error && data) {
                          const { schema } = view.state;
                          // Use the new VerbaImage via 'image' node
                          const node = schema.nodes.image.create({ storagePath });
                          const tr = view.state.tr.replaceSelectionWith(node);
                          view.dispatch(tr);
                        }
                      });
                  }
                });
              });
            }
            return true; // Handled
          }
        }

        const text = slice.content.textBetween(0, slice.content.size, '\n', '\n');
        if (text) {
          const charCount = text.length;
          const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
          
          if (charCount > 0) {
            const docIdMatch = window.location.pathname.match(/\/workspace\/([^/]+)/);
            if (docIdMatch && docIdMatch[1]) {
              fetch(`/api/documents/${docIdMatch[1]}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  event_type: 'paste_inserted',
                  metadata: {
                    character_count: charCount,
                    word_count: wordCount
                  }
                })
              }).catch(err => console.error('Failed to log paste_inserted event:', err));
            }
          }
        }
        return false; // Let Tiptap handle the actual paste
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            const docIdMatch = window.location.pathname.match(/\/workspace\/([^/]+)/);
            if (docIdMatch && docIdMatch[1]) {
              const docId = docIdMatch[1];
              import('@/lib/supabase/client').then(({ createClient }) => {
                const supabase = createClient();
                supabase.auth.getUser().then(({ data: { user } }) => {
                  if (user) {
                    const ext = file.name.split('.').pop() || 'png';
                    const assetId = `img_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                    const storagePath = `${user.id}/${docId}/assets/${assetId}`;
                    
                    supabase.storage.from('documents').upload(storagePath, file)
                      .then(({ data, error }) => {
                        if (!error && data) {
                          const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                          if (coordinates) {
                            const { schema } = view.state;
                            const node = schema.nodes.image.create({ storagePath });
                            const tr = view.state.tr.insert(coordinates.pos, node);
                            view.dispatch(tr);
                          }
                        }
                      });
                  }
                });
              });
            }
            return true;
          }
        }
        return false;
      },
    },
    // onUpdate fires after every document change — used for autosave debouncing upstream
    onUpdate: ({ editor: e }) => {
      if (onUpdate) {
        onUpdate(
          e.getJSON(),
          e.storage.characterCount.words(),
          e.storage.characterCount.characters()
        );
      }
    },
    onFocus: () => {
      if (onFocus) onFocus();
    },
    onBlur: () => {
      // Small delay to allow clicking on CiteTab buttons without instantly disabling them
      setTimeout(() => {
        if (onBlur) onBlur();
      }, 200);
    },
  });

  // Keep highlight extension options in sync when props change
  useEffect(() => {
    if (editor) {
      editor.extensionManager.extensions.forEach(ext => {
        if (ext.name === 'issueHighlight') {
          ext.options.issues = issues;
          ext.options.selectedIssueId = selectedIssueId;
          ext.options.onIssueSelect = onIssueSelect;
        }
      });
      editor.view.dispatch(editor.state.tr.setMeta('updateHighlight', true));
    }
  }, [editor, issues, selectedIssueId, onIssueSelect]);

  // Initialize editor content exactly ONCE (when editor is ready and content not yet set)
  useEffect(() => {
    if (!editor || mounted) return;

    if (initialEditorJson && typeof initialEditorJson === 'object') {
      // CASE A: editor_state exists — load Tiptap JSON directly
      // Check if it's a legacy linear document without sections
      let jsonToLoad = initialEditorJson;
      if (jsonToLoad.content && jsonToLoad.content.length > 0 && jsonToLoad.content[0].type !== 'section') {
        jsonToLoad = {
          type: 'doc',
          content: [
            {
              type: 'section',
              attrs: { columns: 1 },
              content: jsonToLoad.content
            }
          ]
        };
      }
      editor.commands.setContent(jsonToLoad);
    } else if (initialSections && initialSections.length > 0) {
      // CASE B1: editor_state is null — seed from parsed_content sections
      const html = sectionsToHtml(initialSections);
      editor.commands.setContent(html);
    } else if (initialBlocks && initialBlocks.length > 0) {
      // CASE B2: fallback for older AST with just blocks
      const html = sectionsToHtml([{ id: 'default', layout: { type: 'single-column', columns: 1 }, blocks: initialBlocks }]);
      editor.commands.setContent(html);
    }
    // Either way, mark mounted so we never re-initialize from props
    setMounted(true);

    if (onEditorReady) {
      onEditorReady(editor);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const { pageCount, pageModel, currentPage } = usePageLayout(editor, viewMode, scrollContainerRef);

  useEffect(() => {
    if (onPageCountChange) {
      onPageCountChange(pageCount);
    }
  }, [pageCount, onPageCountChange]);

  useEffect(() => {
    if (onCurrentPageChange) {
      onCurrentPageChange(currentPage);
    }
  }, [currentPage, onCurrentPageChange]);

  if (!editor) {
    return null;
  }

  const scale = zoomLevel === 0 ? 1 : zoomLevel / 100;

  const getSelectionContext = () => {
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    
    let blockId = '';
    let paragraphText = '';
    let blockStart = 0;
    let associatedCitations: string[] = [];
    
    editor.state.doc.descendants((node, pos) => {
      if (node.attrs && node.attrs.verbaBlockId) {
        const nodeEnd = pos + node.nodeSize;
        // Check if node overlaps with selection [from, to]
        // from !== to because BubbleMenu only shows when there's a selection
        if (Math.max(pos, from) < Math.min(nodeEnd, to)) {
          if (!blockId) {
            blockId = node.attrs.verbaBlockId;
            paragraphText = node.textContent;
            blockStart = pos + 1;
          }
          
          node.descendants((childNode) => {
            if (childNode.type.name === 'citation' && childNode.attrs.citationId) {
              associatedCitations.push(childNode.attrs.citationId);
            }
          });
        }
      }
    });

    return {
      blockId,
      paragraphText,
      originalText: text,
      startOffset: from - blockStart,
      endOffset: to - blockStart,
      associatedCitations
    };
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F4F5F7] overflow-hidden">
      {/* Document Toolbar - sits above scroll area, not sticky */}
      <div className="shrink-0 z-20 w-full">
        <EditorToolbar editor={editor} />
      </div>

      {/* Scrollable Document Area */}
      {/* Workspace background: py-5 = 20px breathing room above page; px-6 = 24px each side */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 py-5 flex justify-center items-start scroll-smooth w-full"
      >
        <div className="flex flex-col items-center origin-top transition-transform duration-200 w-full" style={{ transform: `scale(${scale})` }}>
          
          <style dangerouslySetInnerHTML={{ __html: `
            .view-mode-print .verba-section {
              width: ${pageModel.pageWidth}px;
              min-height: ${pageModel.pageHeight}px;
              padding-left: ${pageModel.marginLeft}px;
              padding-right: ${pageModel.marginRight}px;
              padding-top: 0px;
              padding-bottom: 0px;
              background-image: linear-gradient(
                to bottom,
                white 0px,
                white ${pageModel.pageHeight}px,
                #e5e7eb ${pageModel.pageHeight}px,
                #f3f4f6 ${pageModel.pageHeight + 2}px,
                #f3f4f6 ${pageModel.pageHeight + pageModel.pageGap - 2}px,
                #e5e7eb ${pageModel.pageHeight + pageModel.pageGap}px
              );
              background-size: 100% ${pageModel.pageHeight + pageModel.pageGap}px;
              background-color: transparent;
            }
          `}} />
          
          {viewMode === 'print' && (
            <DocumentRuler editor={editor} pageModel={pageModel} zoomLevel={zoomLevel} />
          )}

          {/* verba-editor-card: CSS targeted by .view-mode-print to become transparent (sections are pages) */}
          <div 
            className="verba-editor-card bg-white border border-[#E2E6EC] rounded-none shadow-[0_1px_3px_rgba(0,0,0,0.07)] w-full mb-8"
            style={{ 
               maxWidth: `${pageModel.pageWidth}px`, 
               minHeight: `${pageModel.pageHeight}px`,
               paddingTop: `${pageModel.marginTop}px`,
               paddingBottom: `${pageModel.marginBottom}px`,
               paddingLeft: `${pageModel.marginLeft}px`,
               paddingRight: `${pageModel.marginRight}px`,
            }}
            onClick={(e) => {
            const target = e.target as HTMLElement;
            const citationNode = target.closest('[data-citation-id]');
            if (citationNode && onCitationClick) {
              const citationId = citationNode.getAttribute('data-citation-id');
              const sourceId = citationNode.getAttribute('data-source-id');
              if (citationId && sourceId) {
                const rect = citationNode.getBoundingClientRect();
                const blockNode = citationNode.closest('[data-verba-block-id]');
                const contextText = blockNode ? blockNode.textContent || '' : '';
                onCitationClick(citationId, sourceId, contextText, rect);
              }
            }
          }}
        >
          {editor && (
            <BubbleMenu 
              editor={editor}
              shouldShow={({ editor, from, to }) => {
                return from !== to && !editor.isActive('image');
              }}
            >
              <div className="flex bg-[#0B1628] border border-[#213555] shadow-lg rounded-md overflow-hidden">
                <button
                  onClick={() => {
                    const ctx = getSelectionContext();
                    if (ctx.blockId && onAskVerba) onAskVerba(ctx);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-accent transition-colors"
                >
                  <Sparkles size={14} className="text-white" />
                  Ask Verba
                </button>
                <div className="w-[1px] bg-[#213555]" />
                  <button
                    onClick={() => {
                      const ctx = getSelectionContext();
                      if (ctx.blockId && onFindEvidence) onFindEvidence(ctx);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-accent transition-colors"
                  >
                    <Search size={14} className="text-white" />
                    Find Evidence
                  </button>
                <div className="w-[1px] bg-[#213555]" />
                <button
                  onClick={() => {
                    setShowCitationPopover(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-accent transition-colors"
                >
                  <BookOpen size={14} className="text-white" />
                  Cite
                </button>
              </div>
            </BubbleMenu>
          )}
          <EditorContent editor={editor} />
          {editor && (
            <CitationPopover 
              editor={editor}
              isOpen={showCitationPopover}
              onClose={() => setShowCitationPopover(false)}
              documentId={window.location.pathname.split('/').pop() || ''}
            />
          )}
          <CommandPalette editor={editor} />
        </div>
        </div>
      </div>
    </div>
  );
}
