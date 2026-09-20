'use client';

import React, { useState } from 'react';
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
  Square
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor;
}

type Tab = 'home' | 'insert' | 'layout' | 'academic';

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [activeTab, setActiveTab] = useState<Tab>('home');

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

  const setAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
    editor.chain().focus().setTextAlign(align).run();
  };

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

  const Divider = () => <div className="w-[1px] h-[20px] bg-border-light mx-2" />;

  const TabButton = ({ tab, label }: { tab: Tab, label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-3 py-1.5 text-[12px] font-medium transition-colors border-b-2 ${
        activeTab === tab 
          ? 'border-accent text-accent' 
          : 'border-transparent text-foreground-secondary hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col bg-[#F8FAFC] border-b border-border-light/50 sticky top-0 z-10 opacity-95 hover:opacity-100 transition-opacity">
      {/* Tabs Row */}
      <div className="flex items-center px-2 space-x-1 border-b border-border-light/30">
        <TabButton tab="home" label="Home" />
        <TabButton tab="insert" label="Insert" />
        <TabButton tab="layout" label="Layout" />
        <TabButton tab="academic" label="Academic" />
      </div>

      {/* Tools Row */}
      <div className="flex items-center px-3 py-1.5 min-h-[44px] overflow-x-auto">
        {activeTab === 'home' && (
          <>
            <ToolbarButton onClick={undo} disabled={!editor.can().undo()} title="Undo">
              <Undo size={15} />
            </ToolbarButton>
            <ToolbarButton onClick={redo} disabled={!editor.can().redo()} title="Redo">
              <Redo size={15} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton onClick={setParagraph} isActive={editor.isActive('paragraph')} title="Normal Text">
              <Type size={15} />
            </ToolbarButton>
            <ToolbarButton onClick={() => setHeading(1)} isActive={editor.isActive('heading', { level: 1 })} title="Heading 1">
              <Heading1 size={15} />
            </ToolbarButton>
            <ToolbarButton onClick={() => setHeading(2)} isActive={editor.isActive('heading', { level: 2 })} title="Heading 2">
              <Heading2 size={15} />
            </ToolbarButton>
            <ToolbarButton onClick={() => setHeading(3)} isActive={editor.isActive('heading', { level: 3 })} title="Heading 3">
              <Heading3 size={15} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton onClick={toggleBold} isActive={editor.isActive('bold')} disabled={!editor.can().toggleBold()} title="Bold">
              <Bold size={15} />
            </ToolbarButton>
            <ToolbarButton onClick={toggleItalic} isActive={editor.isActive('italic')} disabled={!editor.can().toggleItalic()} title="Italic">
              <Italic size={15} />
            </ToolbarButton>
            <ToolbarButton onClick={toggleUnderline} isActive={editor.isActive('underline')} disabled={!editor.can().toggleUnderline()} title="Underline">
              <Underline size={15} />
            </ToolbarButton>
            <ToolbarButton onClick={toggleSubscript} isActive={editor.isActive('subscript')} disabled={!editor.can().toggleSubscript()} title="Subscript">
              <SubscriptIcon size={15} />
            </ToolbarButton>
            <ToolbarButton onClick={toggleSuperscript} isActive={editor.isActive('superscript')} disabled={!editor.can().toggleSuperscript()} title="Superscript">
              <SuperscriptIcon size={15} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton onClick={() => setAlign('left')} isActive={editor.isActive({ textAlign: 'left' })} title="Align Left">
              <AlignLeft size={15} />
            </ToolbarButton>
            <ToolbarButton onClick={() => setAlign('center')} isActive={editor.isActive({ textAlign: 'center' })} title="Align Center">
              <AlignCenter size={15} />
            </ToolbarButton>
            <ToolbarButton onClick={() => setAlign('right')} isActive={editor.isActive({ textAlign: 'right' })} title="Align Right">
              <AlignRight size={15} />
            </ToolbarButton>
            <ToolbarButton onClick={() => setAlign('justify')} isActive={editor.isActive({ textAlign: 'justify' })} title="Justify">
              <AlignJustify size={15} />
            </ToolbarButton>
          </>
        )}

        {activeTab === 'insert' && (
          <>
            <ToolbarButton onClick={handleImageUpload} title="Insert Image">
              <div className="flex items-center text-[12px] font-medium">Image</div>
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setPageBreak().run()} title="Insert Page Break">
              <div className="flex items-center text-[12px] font-medium"><Scissors size={14} className="mr-1.5"/> Page Break</div>
            </ToolbarButton>
            <ToolbarButton onClick={toggleLink} isActive={editor.isActive('link')} title="Insert Link">
              <div className="flex items-center text-[12px] font-medium">Link</div>
            </ToolbarButton>

            <Divider />

            <ToolbarButton onClick={insertTable} title="Insert Table">
              <div className="flex items-center text-[12px] font-medium"><TableIcon size={14} className="mr-1.5"/> Table</div>
            </ToolbarButton>
            {editor.isActive('table') && (
              <>
                <Divider />
                <span className="text-[10px] uppercase text-foreground-muted font-bold tracking-wider mr-2">Table Tools</span>
                <ToolbarButton onClick={addRow} title="Add Row">
                  <div className="flex items-center text-[11px]"><Plus size={12} className="mr-1"/> Row</div>
                </ToolbarButton>
                <ToolbarButton onClick={deleteRow} title="Delete Row">
                  <div className="flex items-center text-[11px] text-red-500"><Trash2 size={12} className="mr-1"/> Row</div>
                </ToolbarButton>
                <ToolbarButton onClick={addColumn} title="Add Column">
                  <div className="flex items-center text-[11px]"><Plus size={12} className="mr-1"/> Col</div>
                </ToolbarButton>
                <ToolbarButton onClick={deleteColumn} title="Delete Column">
                  <div className="flex items-center text-[11px] text-red-500"><Trash2 size={12} className="mr-1"/> Col</div>
                </ToolbarButton>
                <ToolbarButton onClick={deleteTable} title="Delete Table">
                  <div className="flex items-center text-[11px] text-red-500"><Trash2 size={12} className="mr-1"/> Table</div>
                </ToolbarButton>
              </>
            )}
          </>
        )}

        {activeTab === 'layout' && (
          <>
            <span className="text-[10px] uppercase text-foreground-muted font-bold tracking-wider mr-2">Columns</span>
            <ToolbarButton onClick={() => setColumns(1)} isActive={isColumns(1)} title="1 Column">
              <Square size={15} />
            </ToolbarButton>
            <ToolbarButton onClick={() => setColumns(2)} isActive={isColumns(2)} title="2 Columns">
              <Columns size={15} />
            </ToolbarButton>

            <Divider />
            
            <span className="text-[10px] uppercase text-foreground-muted font-bold tracking-wider mr-2">Page Setup</span>
            <div className="flex items-center space-x-2 text-[12px] text-foreground-secondary">
              <div className="flex flex-col">
                <select 
                  value={editor.getAttributes('section').pageSize || 'A4'} 
                  onChange={(e) => {
                    // @ts-expect-error custom command
                    editor.chain().focus().setSectionPageSize(e.target.value).run();
                  }}
                  className="bg-transparent border border-border-light rounded px-1.5 py-1 outline-none hover:bg-black/5 cursor-pointer min-w-[100px]"
                  title="Page Size"
                >
                  <option value="A4">A4 (210 × 297 mm)</option>
                  <option value="Letter">Letter (8.5" × 11")</option>
                </select>
              </div>
              <div className="flex flex-col">
                <select 
                  value={editor.getAttributes('section').orientation || 'portrait'} 
                  onChange={(e) => {
                    // @ts-expect-error custom command
                    editor.chain().focus().setSectionOrientation(e.target.value).run();
                  }}
                  className="bg-transparent border border-border-light rounded px-1.5 py-1 outline-none hover:bg-black/5 cursor-pointer min-w-[100px]"
                  title="Orientation"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
              <div className="flex flex-col">
                <select 
                  value={editor.getAttributes('section').margins || 'normal'} 
                  onChange={(e) => {
                    // @ts-expect-error custom command
                    editor.chain().focus().setSectionMargins(e.target.value).run();
                  }}
                  className="bg-transparent border border-border-light rounded px-1.5 py-1 outline-none hover:bg-black/5 cursor-pointer min-w-[100px]"
                  title="Margins"
                >
                  <option value="normal">Normal (1")</option>
                  <option value="narrow">Narrow (0.5")</option>
                  <option value="wide">Wide (2")</option>
                </select>
              </div>
            </div>
          </>
        )}

        {activeTab === 'academic' && (
          <>
            <span className="text-[12px] text-foreground-secondary italic px-2">
              Academic tools (Citations, Bibliographies, Footnotes) will be added here in a future update.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
