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
    <div className="flex flex-col bg-white border-b border-[#E2E8F0] z-10 w-full transition-all text-[#475569]">
      {/* Row 2: Menu / Actions */}
      <div className="flex items-center justify-between px-6 py-0.5 border-b border-[#F0F4F8] min-h-[34px]">
        <div className="flex items-center space-x-1 -ml-2 text-[13px]">
          {/* File Menu */}
          <div className="relative group">
            <button className="px-2 py-1 hover:bg-black/5 rounded transition-colors cursor-pointer text-[#475569]">File</button>
            <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-white border border-[#E2E8F0] shadow-lg rounded-md py-1 w-48 z-50">
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5" onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', {'key': 's', 'ctrlKey': true}))}>Save (Ctrl+S)</button>
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5">Export</button>
            </div>
          </div>
          {/* Edit Menu */}
          <div className="relative group">
            <button className="px-2 py-1 hover:bg-black/5 rounded transition-colors cursor-pointer text-[#475569]">Edit</button>
            <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-white border border-[#E2E8F0] shadow-lg rounded-md py-1 w-48 z-50">
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5" onClick={() => editor.chain().focus().undo().run()}>Undo (Ctrl+Z)</button>
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5" onClick={() => editor.chain().focus().redo().run()}>Redo (Ctrl+Y)</button>
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5" onClick={() => editor.chain().focus().selectAll().run()}>Select All</button>
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>Clear Formatting</button>
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5" onClick={() => setShowFindReplace(true)}>Find (Ctrl+F)</button>
            </div>
          </div>
          {/* Insert Menu */}
          <div className="relative group">
            <button className="px-2 py-1 hover:bg-black/5 rounded transition-colors cursor-pointer text-[#475569]">Insert</button>
            <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-white border border-[#E2E8F0] shadow-lg rounded-md py-1 w-48 z-50">
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5" onClick={insertTable}>Table</button>
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5" onClick={handleImageUpload}>Image</button>
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5" onClick={toggleLink}>Link</button>
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5" onClick={() => editor.chain().focus().toggleBlockquote().run()}>Quote</button>
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5" onClick={() => editor.chain().focus().setPageBreak().run()}>Page Break</button>
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5" onClick={() => (editor.chain().focus() as any).insertMathEquation().run()}>Equation</button>
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5" onClick={() => {}}>Citation</button>
            </div>
          </div>
          {/* Format Menu */}
          <div className="relative group">
            <button className="px-2 py-1 hover:bg-black/5 rounded transition-colors cursor-pointer text-[#475569]">Format</button>
            <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-white border border-[#E2E8F0] shadow-lg rounded-md py-1 w-48 z-50 max-h-[300px] overflow-y-auto">
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5 font-bold" onClick={toggleBold}>Bold</button>
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5 italic" onClick={toggleItalic}>Italic</button>
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5 underline" onClick={toggleUnderline}>Underline</button>
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5 line-through" onClick={() => editor.chain().focus().toggleStrike().run()}>Strikethrough</button>
              <div className="h-[1px] bg-border-light my-1" />
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5" onClick={() => setAlign('left')}>Align Left</button>
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5" onClick={() => setAlign('center')}>Align Center</button>
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5" onClick={() => setAlign('right')}>Align Right</button>
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5" onClick={() => setAlign('justify')}>Justify</button>
              <div className="h-[1px] bg-border-light my-1" />
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5" onClick={() => editor.chain().focus().toggleBulletList().run()}>Bullet List</button>
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5" onClick={() => editor.chain().focus().toggleOrderedList().run()}>Numbered List</button>
            </div>
          </div>
          {/* References Menu */}
          <div className="relative group">
            <button className="px-2 py-1 hover:bg-black/5 rounded transition-colors cursor-pointer text-[#475569]">References</button>
            <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-white border border-[#E2E8F0] shadow-lg rounded-md py-1 w-48 z-50">
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5">Add Citation</button>
              <button className="w-full text-left px-4 py-1.5 hover:bg-black/5">Find Evidence</button>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={() => setShowFindReplace(!showFindReplace)} className="flex items-center space-x-1.5 text-[13px] font-medium hover:text-[#0F172A] transition-colors text-[#475569]">
            <Search size={14} />
            <span>Find (Ctrl + F)</span>
          </button>
        </div>
      </div>

      {/* Row 3: Formatting */}
      <div className="flex items-center px-6 py-1 min-h-[38px] overflow-x-auto no-scrollbar space-x-1">
        <div className="flex items-center space-x-0.5 shrink-0 -ml-1.5">
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)" disabled={!editor.can().undo()}>
            <Undo size={14} className="opacity-70" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Y)" disabled={!editor.can().redo()}>
            <Redo size={14} className="opacity-70" />
          </ToolbarButton>
        </div>

        <div className="w-[1px] h-5 bg-[#E2E8F0] mx-2 shrink-0" />

        <div className="flex items-center space-x-2 text-[13px] shrink-0">
          <div className="relative group">
            <select 
              value={editor.isActive('heading', { level: 1 }) ? 'h1' : editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
              onChange={(e) => {
                if (e.target.value === 'p') editor.chain().focus().setParagraph().run();
                else if (e.target.value === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
                else if (e.target.value === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
                else if (e.target.value === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
              }}
              className="appearance-none bg-transparent border-none rounded px-2 py-1 pr-6 min-w-[90px] hover:bg-black/5 outline-none cursor-pointer"
            >
              <option value="p">Normal</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
          </div>

          <div className="relative group">
            <select 
              value={editor.getAttributes('textStyle').fontFamily || 'Inter'}
              onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
              className="appearance-none bg-transparent border-none rounded px-2 py-1 pr-6 min-w-[80px] hover:bg-black/5 outline-none cursor-pointer"
            >
              <option value="Inter">Inter</option>
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
          </div>

          <div className="relative group">
            <select 
              value={editor.getAttributes('textStyle').fontSize || '12'}
              onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
              className="appearance-none bg-transparent border-none rounded px-2 py-1 pr-6 min-w-[60px] hover:bg-black/5 outline-none cursor-pointer"
            >
              <option value="10">10</option>
              <option value="11">11</option>
              <option value="12">12</option>
              <option value="14">14</option>
              <option value="16">16</option>
              <option value="18">18</option>
              <option value="20">20</option>
              <option value="24">24</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
          </div>
        </div>

        <div className="w-[1px] h-5 bg-[#E2E8F0] mx-2 shrink-0" />

        <div className="flex items-center space-x-0.5 text-[#0F172A] shrink-0">
          <ToolbarButton isActive={editor.isActive('bold')} onClick={toggleBold} title="Bold (Ctrl+B)">
            <span className="font-serif font-bold text-[14px]">B</span>
          </ToolbarButton>
          <ToolbarButton isActive={editor.isActive('italic')} onClick={toggleItalic} title="Italic (Ctrl+I)">
            <span className="font-serif italic text-[14px]">I</span>
          </ToolbarButton>
          <ToolbarButton isActive={editor.isActive('underline')} onClick={toggleUnderline} title="Underline (Ctrl+U)">
            <span className="font-serif underline text-[14px]">U</span>
          </ToolbarButton>
          <ToolbarButton isActive={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
            <span className="font-serif line-through text-[14px]">S</span>
          </ToolbarButton>
          <ToolbarButton isActive={editor.isActive('subscript')} onClick={toggleSubscript} title="Subscript">
            <span className="font-serif text-[13px]">x₂</span>
          </ToolbarButton>
          <ToolbarButton isActive={editor.isActive('superscript')} onClick={toggleSuperscript} title="Superscript">
            <span className="font-serif text-[13px]">x²</span>
          </ToolbarButton>
        </div>

        <div className="w-[1px] h-5 bg-[#E2E8F0] mx-2 shrink-0" />

        <div className="flex items-center space-x-1 shrink-0 relative">
          <ToolbarButton title="Text Color" onClick={() => {
            const color = window.prompt('Color (hex or name):', editor.getAttributes('textStyle').color || '#000000');
            if (color) editor.chain().focus().setColor(color).run();
          }}>
            <div className="flex flex-col items-center">
              <span className="font-serif text-[13px] leading-none text-[#0F172A]">A</span>
              <div className="w-3 h-0.5 mt-[1px]" style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }} />
            </div>
            <ChevronDown size={10} className="ml-1 opacity-50" />
          </ToolbarButton>
          <ToolbarButton title="Highlight Color" onClick={() => {
            const color = window.prompt('Highlight Color (hex or name):', editor.getAttributes('highlight').color || '#FFFF00');
            if (color) editor.chain().focus().setHighlight({ color }).run();
          }}>
            <div className="flex flex-col items-center">
              <Highlighter size={13} className="text-[#0F172A]" />
              <div className="w-3 h-0.5 mt-[1px]" style={{ backgroundColor: editor.getAttributes('highlight').color || '#FFFF00' }} />
            </div>
            <ChevronDown size={10} className="ml-1 opacity-50" />
          </ToolbarButton>
        </div>

        <div className="w-[1px] h-5 bg-[#E2E8F0] mx-2 shrink-0" />

        <div className="flex items-center space-x-0.5 text-[#0F172A] shrink-0">
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

        <div className="w-[1px] h-5 bg-[#E2E8F0] mx-2 shrink-0" />

        <div className="flex items-center space-x-0.5 text-[#0F172A] shrink-0">
          <ToolbarButton isActive={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
            <List size={14} />
          </ToolbarButton>
          <ToolbarButton isActive={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
            <ListOrdered size={14} />
          </ToolbarButton>
        </div>

        <div className="w-[1px] h-5 bg-[#E2E8F0] mx-2 shrink-0" />

        <div className="flex items-center space-x-0.5 text-[#0F172A] shrink-0">
          <ToolbarButton onClick={() => (editor.chain().focus() as any).outdent().run()} title="Decrease Indent" disabled={!(editor.can() as any).outdent?.()}>
            <Outdent size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => (editor.chain().focus() as any).indent().run()} title="Increase Indent" disabled={!(editor.can() as any).indent?.()}>
            <Indent size={14} />
          </ToolbarButton>
        </div>

        <div className="w-[1px] h-5 bg-[#E2E8F0] mx-2 shrink-0" />

        <div className="flex items-center space-x-0.5 text-[#0F172A] shrink-0 relative">
          <div className="relative group flex items-center">
            <div className="absolute left-2 pointer-events-none opacity-70 text-[#0F172A]">
              <ArrowUpDown size={13} />
            </div>
            <select 
              value={editor.getAttributes('paragraph').lineHeight || '1.5'}
              onChange={(e) => editor.chain().focus().setLineHeight(e.target.value).run()}
              className="appearance-none bg-transparent border-none rounded pl-7 pr-6 py-1 hover:bg-black/5 outline-none cursor-pointer h-7"
              title="Line Spacing"
            >
              <option value="1.0">1.0</option>
              <option value="1.15">1.15</option>
              <option value="1.5">1.5</option>
              <option value="2.0">2.0</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 opacity-50 pointer-events-none" />
          </div>
        </div>

        <div className="w-[1px] h-5 bg-[#E2E8F0] mx-2 shrink-0" />

        <div className="flex items-center space-x-0.5 text-[#0F172A] shrink-0">
          <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear Formatting">
            <Eraser size={14} />
          </ToolbarButton>
        </div>
        <div className="w-[1px] h-5 bg-[#E2E8F0] mx-2 shrink-0" />

        <button className="flex items-center space-x-1.5 hover:bg-black/5 px-2 py-1 rounded transition-colors text-[13px] font-medium text-[#475569]">
          <span>Cite</span>
        </button>

        <button className="flex items-center justify-center w-7 h-7 hover:bg-black/5 rounded transition-colors text-[#475569] ml-1">
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Find & Replace Floating Dialog */}
      {showFindReplace && (
        <div className="absolute top-[100px] right-[20px] bg-white border border-border-light shadow-lg rounded-md p-3 w-[280px] z-20 flex flex-col space-y-2">
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
