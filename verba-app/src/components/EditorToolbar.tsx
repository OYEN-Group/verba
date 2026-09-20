'use client';

import React from 'react';
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

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) {
    return null;
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();
  const toggleSubscript = () => editor.chain().focus().toggleSubscript().run();
  const toggleSuperscript = () => editor.chain().focus().toggleSuperscript().run();

  const setColumns = (cols: 1 | 2) => {
    // @ts-expect-error setSectionColumns is custom
    editor.chain().focus().setSectionColumns(cols).run();
  };

  // Helper to check if current section is multi-column
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

  const setHeading = (level: 1 | 2 | 3) => {
    editor.chain().focus().toggleHeading({ level }).run();
  };
  
  const setParagraph = () => {
    editor.chain().focus().setParagraph().run();
  };

  const undo = () => editor.chain().focus().undo().run();
  const redo = () => editor.chain().focus().redo().run();

  const ToolbarButton = ({ 
    isActive = false, 
    onClick, 
    disabled = false, 
    children 
  }: { 
    isActive?: boolean; 
    onClick?: () => void; 
    disabled?: boolean; 
    children: React.ReactNode; 
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors flex items-center justify-center
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/5'}
        ${isActive ? 'bg-accent/10 text-accent font-medium' : 'text-foreground-secondary'}
      `}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-[1px] h-[16px] bg-border-light mx-1" />;

  return (
    <div className="flex items-center px-4 py-1.5 space-x-0.5 overflow-x-auto bg-white border-b border-border-light/50 sticky top-0 z-10 opacity-80 hover:opacity-100 transition-opacity">
      {/* History */}
      <ToolbarButton onClick={undo} disabled={!editor.can().undo()}>
        <Undo size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={redo} disabled={!editor.can().redo()}>
        <Redo size={16} />
      </ToolbarButton>

      <Divider />

      {/* Styles */}
      <ToolbarButton onClick={setParagraph} isActive={editor.isActive('paragraph')}>
        <Type size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => setHeading(1)} isActive={editor.isActive('heading', { level: 1 })}>
        <Heading1 size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => setHeading(2)} isActive={editor.isActive('heading', { level: 2 })}>
        <Heading2 size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => setHeading(3)} isActive={editor.isActive('heading', { level: 3 })}>
        <Heading3 size={16} />
      </ToolbarButton>

      <Divider />

      {/* Text Marks */}
      <ToolbarButton onClick={toggleBold} isActive={editor.isActive('bold')} disabled={!editor.can().toggleBold()}>
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={toggleItalic} isActive={editor.isActive('italic')} disabled={!editor.can().toggleItalic()}>
        <Italic size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={toggleUnderline} isActive={editor.isActive('underline')} disabled={!editor.can().toggleUnderline()}>
        <Underline size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={toggleSubscript} isActive={editor.isActive('subscript')} disabled={!editor.can().toggleSubscript()}>
        <SubscriptIcon size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={toggleSuperscript} isActive={editor.isActive('superscript')} disabled={!editor.can().toggleSuperscript()}>
        <SuperscriptIcon size={16} />
      </ToolbarButton>

      <Divider />

      {/* Alignment */}
      <ToolbarButton onClick={() => setAlign('left')} isActive={editor.isActive({ textAlign: 'left' })}>
        <AlignLeft size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => setAlign('center')} isActive={editor.isActive({ textAlign: 'center' })}>
        <AlignCenter size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => setAlign('right')} isActive={editor.isActive({ textAlign: 'right' })}>
        <AlignRight size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => setAlign('justify')} isActive={editor.isActive({ textAlign: 'justify' })}>
        <AlignJustify size={16} />
      </ToolbarButton>

      <Divider />

      {/* Layout */}
      <ToolbarButton onClick={() => setColumns(1)} isActive={isColumns(1)} title="1 Column">
        <Square size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => setColumns(2)} isActive={isColumns(2)} title="2 Columns">
        <Columns size={16} />
      </ToolbarButton>

      <Divider />

      {/* Insert */}
      <ToolbarButton onClick={() => editor.chain().focus().setPageBreak().run()} title="Insert Page Break">
        <div className="flex items-center text-xs font-medium"><Scissors size={14} className="mr-1"/> Page Break</div>
      </ToolbarButton>

      <Divider />

      {/* Tables */}
      <ToolbarButton onClick={insertTable}>
        <TableIcon size={16} />
      </ToolbarButton>
      {editor.isActive('table') && (
        <>
          <ToolbarButton onClick={addRow} title="Add Row">
            <div className="flex items-center"><Plus size={12} className="mr-0.5"/> Row</div>
          </ToolbarButton>
          <ToolbarButton onClick={deleteRow} title="Delete Row">
            <div className="flex items-center text-red-500"><Trash2 size={12} className="mr-0.5"/> Row</div>
          </ToolbarButton>
          <ToolbarButton onClick={addColumn} title="Add Column">
            <div className="flex items-center"><Plus size={12} className="mr-0.5"/> Col</div>
          </ToolbarButton>
          <ToolbarButton onClick={deleteColumn} title="Delete Column">
            <div className="flex items-center text-red-500"><Trash2 size={12} className="mr-0.5"/> Col</div>
          </ToolbarButton>
          <ToolbarButton onClick={deleteTable} title="Delete Table">
            <div className="flex items-center text-red-500"><Trash2 size={12} className="mr-0.5"/> Table</div>
          </ToolbarButton>
        </>
      )}
    </div>
  );
}
