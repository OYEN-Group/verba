'use client';

import React, { useState, useEffect } from 'react';
import { type Editor } from '@tiptap/react';
import { 
  Bold, 
  Italic, 
  Underline, 
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
  Sparkles
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
    <div className="flex flex-col bg-white border-b border-border-light sticky top-0 z-10 w-full">
      <div className="flex items-center px-4 py-2 min-h-[48px] w-full overflow-x-auto no-scrollbar justify-center">
        <div className="flex items-center mx-auto space-x-1 max-w-[800px] w-full">
          
          {/* Text Style */}
          <select 
            value={editor.isActive('heading', { level: 1 }) ? 'h1' : editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
            onChange={(e) => {
              if (e.target.value === 'p') editor.chain().focus().setParagraph().run();
              else if (e.target.value === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
              else if (e.target.value === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
              else if (e.target.value === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
            }}
            className="text-[13px] font-medium text-[#0B1628] bg-transparent border-none outline-none cursor-pointer hover:bg-black/5 rounded px-2 py-1.5 min-w-[100px]"
          >
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>

          <Divider />

          {/* Basic Formatting */}
          <div className="flex items-center space-x-0.5">
            <ToolbarButton isActive={editor.isActive('bold')} onClick={toggleBold} title="Bold (Ctrl+B)">
              <Bold size={15} />
            </ToolbarButton>
            <ToolbarButton isActive={editor.isActive('italic')} onClick={toggleItalic} title="Italic (Ctrl+I)">
              <Italic size={15} />
            </ToolbarButton>
            <ToolbarButton isActive={editor.isActive('underline')} onClick={toggleUnderline} title="Underline (Ctrl+U)">
              <Underline size={15} />
            </ToolbarButton>
          </div>

          <Divider />

          {/* Lists */}
          <div className="flex items-center space-x-0.5">
            <ToolbarButton isActive={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
              <List size={15} />
            </ToolbarButton>
            <ToolbarButton isActive={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
              <ListOrdered size={15} />
            </ToolbarButton>
          </div>

          <Divider />

          {/* Academic Actions */}
          <div className="flex items-center space-x-1">
            <ToolbarButton isActive={editor.isActive('link')} onClick={toggleLink} title="Insert Link">
              <Link2 size={15} />
            </ToolbarButton>
            <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-foreground-secondary hover:text-foreground hover:bg-black/5 transition-colors text-[13px] font-medium">
              <span className="font-serif text-[16px] leading-none mb-0.5">“</span>
            </button>
            <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-foreground-secondary hover:text-foreground hover:bg-black/5 transition-colors text-[13px] font-medium">
              <Quote size={14} />
              <span>Cite</span>
            </button>
          </div>

          <Divider />

          {/* Ask Verba */}
          <button className="flex items-center space-x-1.5 px-4 h-9 rounded-lg bg-[#F0F4FF] text-[#4E75C4] hover:bg-blue-100 transition-colors text-[13px] font-bold mx-2">
            <Sparkles size={16} />
            <span>Ask Verba</span>
          </button>

          <div className="flex-1" />

          {/* Right Actions */}
          <div className="flex items-center space-x-1 shrink-0">
            <button onClick={() => setShowFindReplace(!showFindReplace)} className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${showFindReplace ? 'bg-accent/10 text-accent' : 'text-foreground-secondary hover:bg-black/5 hover:text-foreground'}`} title="Find & Replace (Ctrl+F)">
              <Search size={16} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-secondary hover:bg-black/5 hover:text-foreground transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>
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
