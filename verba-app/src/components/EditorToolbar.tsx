'use client';

import React, { useState, useEffect } from 'react';
import { type Editor } from '@tiptap/react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Table as TableIcon,
  Plus,
  Trash2,
  Scissors,
  Columns,
  Square,
  Paintbrush,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Eraser,
  Palette,
  Highlighter,
  ChevronDown,
  Sigma,
  PlusCircle,
  Search,
  Link2,
  Quote,
  MoreHorizontal,
  Sparkles,
  MessageSquare,
  Baseline,
  Image as ImageIcon,
  Minus,
  Omega,
  ArrowUpDown
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor;
}

type Tab = 'home' | 'insert' | 'layout' | 'academic';

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');

  if (!editor) {
    return null;
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();
  const toggleSubscript = () => editor.chain().focus().toggleSubscript().run();
  const toggleSuperscript = () => editor.chain().focus().toggleSuperscript().run();

  const setColumns = (cols: 1 | 2) => {
    editor.chain().focus().setSectionColumns(cols).run();
  };

  const isColumns = (cols: number) => {
    return editor.isActive('section', { columns: cols });
  };

  const insertTable = () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  const deleteTable = () => editor.chain().focus().deleteTable().run();
  const addRow = () => editor.chain().focus().addRowAfter().run();
  const deleteRow = () => editor.chain().focus().deleteRow().run();
  const addColumn = () => editor.chain().focus().addColumnAfter().run();
  const deleteColumn = () => editor.chain().focus().deleteColumn().run();

  const setAlign = (alignment: string) => {
    editor.chain().focus().setTextAlign(alignment).run();
  };

  const handleFind = () => {
    if (!searchTerm) return;
    (editor.chain().focus() as any).setSearchTerm(searchTerm).run();
  };

  const handleNext = () => {
    (editor.chain().focus() as any).nextSearchResult().run();
  };

  const handlePrev = () => {
    (editor.chain().focus() as any).previousSearchResult().run();
  };

  const handleReplace = () => {
    (editor.chain().focus() as any).replace(replaceTerm).run();
  };

  const handleReplaceAll = () => {
    (editor.chain().focus() as any).replaceAll(replaceTerm).run();
  };

  // Close find dialog on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showFindReplace) {
        setShowFindReplace(false);
        (editor.chain() as any).setSearchTerm('').run(); // clear search
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFindReplace, editor]);

  const setHeading = (level: 1 | 2 | 3 | 4) => {
    editor.chain().focus().toggleHeading({ level }).run();
  };
  
  const setParagraph = () => {
    editor.chain().focus().setParagraph().run();
  };

  const toggleLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
    } else {
      const url = window.prompt('URL');
      if (url) {
        editor.chain().focus().setLink({ href: url }).run();
      }
    }
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const docIdMatch = window.location.pathname.match(/\/workspace\/([^/]+)/);
        if (docIdMatch && docIdMatch[1]) {
          const docId = docIdMatch[1];
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const ext = file.name.split('.').pop() || 'png';
            const assetId = `img_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
            const storagePath = `${user.id}/${docId}/assets/${assetId}`;
            
            const { data, error } = await supabase.storage.from('documents').upload(storagePath, file);
            if (!error && data) {
              (editor.chain().focus() as any).setImage({ storagePath }).run();
            } else {
              console.error('Failed to upload image:', error);
            }
          }
        }
      }
    };
    input.click();
  };

  const undo = () => editor.chain().focus().undo().run();
  const redo = () => editor.chain().focus().redo().run();

  const ToolbarButton = ({ 
    isActive = false, 
    onClick, 
    disabled = false, 
    title,
    children 
  }: { 
    isActive?: boolean; 
    onClick?: () => void; 
    disabled?: boolean; 
    title?: string;
    children: React.ReactNode; 
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors flex items-center justify-center min-w-[28px] h-[28px]
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5'}
        ${isActive ? 'bg-accent/10 text-accent font-medium' : 'text-foreground-secondary'}
      `}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-[1px] h-[32px] bg-border-light mx-2" />;



  return (
    <div className="flex flex-col bg-white border-b border-[#F0F4F8] sticky top-0 z-10 w-full transition-all text-[#475569]">
      
      {/* Row 2: Menu / Actions */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-[#F0F4F8] min-h-[44px]">
        <div className="flex items-center space-x-1 text-[13px] font-medium">
          <button className="px-3 py-1.5 bg-[#EEF2FF] text-[#4F46E5] rounded-md transition-colors">File</button>
          <button className="px-3 py-1.5 hover:bg-black/5 rounded-md transition-colors">Edit</button>
          <button className="px-3 py-1.5 hover:bg-black/5 rounded-md transition-colors">Insert</button>
          <button className="px-3 py-1.5 hover:bg-black/5 rounded-md transition-colors">Format</button>
          <button className="px-3 py-1.5 hover:bg-black/5 rounded-md transition-colors">References</button>
          <button className="px-3 py-1.5 hover:bg-black/5 rounded-md transition-colors">Review</button>
          <button className="px-3 py-1.5 hover:bg-black/5 rounded-md transition-colors">View</button>
          <button className="px-3 py-1.5 hover:bg-black/5 rounded-md transition-colors">Help</button>
        </div>
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#E0E7FF] transition-colors text-[13px] font-semibold">
            <Sparkles size={14} />
            <span>Ask Verba</span>
          </button>
          <div className="w-[1px] h-4 bg-[#E2E8F0]" />
          <button onClick={() => setShowFindReplace(!showFindReplace)} className="flex items-center space-x-1.5 text-[13px] font-medium hover:text-[#0F172A] transition-colors">
            <Search size={14} />
            <span>Find (Ctrl + F)</span>
          </button>
          <button className="flex items-center space-x-1.5 text-[13px] font-medium hover:text-[#0F172A] transition-colors">
            <MessageSquare size={14} />
            <span>Comments</span>
          </button>
        </div>
      </div>

      {/* Row 3: Formatting */}
      <div className="flex items-center px-6 py-2 border-b border-[#F0F4F8] min-h-[44px] overflow-x-auto no-scrollbar space-x-1">
        <div className="flex items-center space-x-0.5">
          <ToolbarButton onClick={undo} title="Undo">
            <Undo size={14} className="opacity-70" />
          </ToolbarButton>
          <ToolbarButton onClick={redo} title="Redo">
            <Redo size={14} className="opacity-70" />
          </ToolbarButton>
        </div>

        <div className="w-[1px] h-5 bg-[#E2E8F0] mx-2" />

        <div className="flex items-center space-x-2 text-[13px]">
          <button className="flex items-center justify-between border border-[#E2E8F0] rounded px-2 py-1 min-w-[90px] hover:bg-black/5">
            <span>Normal</span>
            <ChevronDown size={12} className="opacity-50" />
          </button>
          <button className="flex items-center justify-between border border-[#E2E8F0] rounded px-2 py-1 min-w-[80px] hover:bg-black/5">
            <span>Inter</span>
            <ChevronDown size={12} className="opacity-50" />
          </button>
          <button className="flex items-center justify-between border border-[#E2E8F0] rounded px-2 py-1 min-w-[50px] hover:bg-black/5">
            <span>12</span>
            <ChevronDown size={12} className="opacity-50" />
          </button>
        </div>

        <div className="w-[1px] h-5 bg-[#E2E8F0] mx-2" />

        <div className="flex items-center space-x-0.5 text-[#0F172A]">
          <ToolbarButton isActive={editor.isActive('bold')} onClick={toggleBold} title="Bold">
            <span className="font-serif font-bold text-[14px]">B</span>
          </ToolbarButton>
          <ToolbarButton isActive={editor.isActive('italic')} onClick={toggleItalic} title="Italic">
            <span className="font-serif italic text-[14px]">I</span>
          </ToolbarButton>
          <ToolbarButton isActive={editor.isActive('underline')} onClick={toggleUnderline} title="Underline">
            <span className="font-serif underline text-[14px]">U</span>
          </ToolbarButton>
          <ToolbarButton isActive={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
            <span className="font-serif line-through text-[14px]">S</span>
          </ToolbarButton>
        </div>

        <div className="w-[1px] h-5 bg-[#E2E8F0] mx-2" />

        <div className="flex items-center space-x-1">
          <ToolbarButton title="Text Color">
            <div className="flex flex-col items-center">
              <span className="font-serif text-[13px] leading-none text-[#0F172A]">A</span>
              <div className="w-3 h-0.5 bg-[#0F172A] mt-0.5" />
            </div>
            <ChevronDown size={10} className="ml-1 opacity-50" />
          </ToolbarButton>
          <ToolbarButton title="Highlight Color">
            <div className="flex flex-col items-center">
              <Highlighter size={13} className="text-[#0F172A]" />
              <div className="w-3 h-0.5 bg-yellow-400 mt-0.5" />
            </div>
            <ChevronDown size={10} className="ml-1 opacity-50" />
          </ToolbarButton>
        </div>

        <div className="w-[1px] h-5 bg-[#E2E8F0] mx-2" />

        <div className="flex items-center space-x-0.5 text-[#0F172A]">
          <ToolbarButton isActive={editor.isActive({ textAlign: 'left' })} onClick={() => setAlign('left')} title="Align Left">
            <AlignLeft size={14} />
          </ToolbarButton>
          <ToolbarButton isActive={editor.isActive({ textAlign: 'center' })} onClick={() => setAlign('center')} title="Align Center">
            <AlignCenter size={14} />
          </ToolbarButton>
          <ToolbarButton isActive={editor.isActive({ textAlign: 'right' })} onClick={() => setAlign('right')} title="Align Right">
            <AlignRight size={14} />
          </ToolbarButton>
          <ToolbarButton isActive={editor.isActive({ textAlign: 'justify' })} onClick={() => setAlign('justify')} title="Justify">
            <AlignJustify size={14} />
          </ToolbarButton>
        </div>

        <div className="w-[1px] h-5 bg-[#E2E8F0] mx-2" />

        <div className="flex items-center space-x-0.5 text-[#0F172A]">
          <ToolbarButton isActive={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
            <List size={14} />
            <ChevronDown size={10} className="ml-0.5 opacity-50" />
          </ToolbarButton>
          <ToolbarButton isActive={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
            <ListOrdered size={14} />
            <ChevronDown size={10} className="ml-0.5 opacity-50" />
          </ToolbarButton>
        </div>
        
        <div className="w-[1px] h-5 bg-[#E2E8F0] mx-2" />

        <div className="flex items-center space-x-0.5 text-[#0F172A]">
          <ToolbarButton title="Line Spacing">
            <ArrowUpDown size={14} />
            <ChevronDown size={10} className="ml-0.5 opacity-50" />
          </ToolbarButton>
        </div>
      </div>

      {/* Row 4: Insert / Advanced */}
      <div className="flex items-center px-6 py-2 min-h-[44px] overflow-x-auto no-scrollbar space-x-1">
        <div className="flex items-center space-x-2 text-[12px] font-medium text-[#475569]">
          <button className="flex items-center space-x-1.5 hover:bg-black/5 px-2 py-1.5 rounded-md transition-colors" onClick={insertTable}>
            <TableIcon size={14} />
            <span>Table</span>
            <ChevronDown size={12} className="opacity-50 ml-0.5" />
          </button>
          <button className="flex items-center space-x-1.5 hover:bg-black/5 px-2 py-1.5 rounded-md transition-colors" onClick={handleImageUpload}>
            <ImageIcon size={14} />
            <span>Image</span>
            <ChevronDown size={12} className="opacity-50 ml-0.5" />
          </button>
          <button className="flex items-center space-x-1.5 hover:bg-black/5 px-2 py-1.5 rounded-md transition-colors" onClick={toggleLink}>
            <Link2 size={14} />
            <span>Link</span>
          </button>
          <button className="flex items-center space-x-1.5 hover:bg-black/5 px-2 py-1.5 rounded-md transition-colors">
            <Quote size={14} />
            <span>Quote</span>
          </button>
        </div>

        <div className="w-[1px] h-5 bg-[#E2E8F0] mx-3" />

        <div className="flex items-center space-x-2 text-[12px] font-medium text-[#475569]">
          <button className="flex items-center space-x-1.5 hover:bg-black/5 px-2 py-1.5 rounded-md transition-colors">
            <Minus size={14} />
            <span>Page Break</span>
          </button>
          <button className="flex items-center space-x-1.5 hover:bg-black/5 px-2 py-1.5 rounded-md transition-colors">
            <Baseline size={14} />
            <span>Footnote</span>
          </button>
          <button className="flex items-center space-x-1.5 hover:bg-black/5 px-2 py-1.5 rounded-md transition-colors">
            <Sigma size={14} />
            <span>Equation</span>
          </button>
          <button className="flex items-center space-x-1.5 hover:bg-black/5 px-2 py-1.5 rounded-md transition-colors">
            <Omega size={14} />
            <span>Symbol</span>
          </button>
          <button className="flex items-center space-x-1.5 hover:bg-black/5 px-2 py-1.5 rounded-md transition-colors">
            <Quote size={14} />
            <span>Cite</span>
            <ChevronDown size={12} className="opacity-50 ml-0.5" />
          </button>
        </div>

        <div className="flex-1" />

        <button className="flex items-center space-x-1.5 hover:bg-black/5 px-3 py-1.5 rounded-md transition-colors text-[12px] font-medium text-[#475569]">
          <MoreHorizontal size={14} />
          <span>More</span>
        </button>
      </div>

      {/* Find & Replace Floating Dialog */}
      {showFindReplace && (
        <div className="absolute top-[60px] right-[20px] bg-white border border-border-light shadow-lg rounded-md p-3 w-[280px] z-20 flex flex-col space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] font-semibold text-[#0B1628]">Find & Replace</span>
            <button onClick={() => setShowFindReplace(false)} className="text-foreground-muted hover:text-foreground">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="flex space-x-1">
            <input 
              autoFocus
              type="text" 
              placeholder="Find..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFind()}
              className="flex-1 text-[12px] border border-border-light rounded px-2 py-1 outline-none focus:border-accent"
            />
            <button onClick={handleFind} className="px-2 bg-accent text-white text-[11px] rounded hover:bg-accent-hover font-medium">Find</button>
          </div>
          <div className="flex space-x-1 justify-end">
            <button onClick={handlePrev} className="px-1.5 py-1 text-[11px] bg-black/5 hover:bg-black/10 rounded">Prev</button>
            <button onClick={handleNext} className="px-1.5 py-1 text-[11px] bg-black/5 hover:bg-black/10 rounded">Next</button>
          </div>
          <div className="flex space-x-1 mt-2">
            <input 
              type="text" 
              placeholder="Replace with..." 
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              className="flex-1 text-[12px] border border-border-light rounded px-2 py-1 outline-none focus:border-accent"
            />
          </div>
          <div className="flex space-x-1 mt-1 justify-end">
            <button onClick={handleReplace} className="px-2 py-1 bg-black/5 hover:bg-black/10 text-[11px] rounded">Replace</button>
            <button onClick={handleReplaceAll} className="px-2 py-1 bg-black/5 hover:bg-black/10 text-[11px] rounded">Replace All</button>
          </div>
        </div>
      )}
    </div>
  );
}
