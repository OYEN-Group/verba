import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { Editor } from '@tiptap/react';

interface Command {
  id: string;
  label: string;
  action: () => void;
}

export function CommandPalette({ editor }: { editor: Editor | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setQuery('');
        setSelectedIndex(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen || !editor) return null;

  const commands: Command[] = [
    { id: 'cite', label: 'Insert Citation', action: () => window.dispatchEvent(new CustomEvent('verba:open-cite-inline')) },
    { id: 'evidence', label: 'Find Evidence', action: () => window.dispatchEvent(new CustomEvent('verba:find-evidence')) },
    { id: 'table', label: 'Insert Table', action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { id: 'image', label: 'Insert Image', action: () => {
        const url = window.prompt('URL');
        if (url) editor.chain().focus().setFigure({ src: url }).run();
      }
    },
    { id: 'equation', label: 'Insert Equation', action: () => (editor.chain().focus() as any).insertMathEquation().run() },
    { id: 'page-break', label: 'Insert Page Break', action: () => editor.chain().focus().setPageBreak().run() },
    { id: 'caption-figure', label: 'Insert Figure Caption', action: () => editor.chain().focus().insertContent({ type: 'caption', attrs: { captionType: 'figure' } }).run() },
    { id: 'caption-table', label: 'Insert Table Caption', action: () => editor.chain().focus().insertContent({ type: 'caption', attrs: { captionType: 'table' } }).run() },
    { id: 'toc', label: 'Insert Table of Contents', action: () => editor.chain().focus().insertContent({ type: 'tableOfContents' }).run() },
    { id: 'h1', label: 'Heading 1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).updateAttributes('heading', { verbaStyle: null }).run() },
    { id: 'h2', label: 'Heading 2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).updateAttributes('heading', { verbaStyle: null }).run() },
    { id: 'h3', label: 'Heading 3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).updateAttributes('heading', { verbaStyle: null }).run() },
    { id: 'title', label: 'Title', action: () => editor.chain().focus().toggleHeading({ level: 1 }).updateAttributes('heading', { verbaStyle: 'title' }).run() },
    { id: 'subtitle', label: 'Subtitle', action: () => editor.chain().focus().toggleHeading({ level: 2 }).updateAttributes('heading', { verbaStyle: 'subtitle' }).run() },
    { id: 'normal', label: 'Normal Paragraph', action: () => editor.chain().focus().setParagraph().updateAttributes('paragraph', { verbaStyle: null }).run() },
    { id: 'quote', label: 'Block Quote', action: () => editor.chain().focus().toggleBlockquote().run() },
    { id: 'line-spacing-1', label: 'Line Spacing 1.0', action: () => editor.chain().focus().setLineHeight('1.0').run() },
    { id: 'line-spacing-1.5', label: 'Line Spacing 1.5', action: () => editor.chain().focus().setLineHeight('1.5').run() },
    { id: 'line-spacing-2', label: 'Line Spacing 2.0', action: () => editor.chain().focus().setLineHeight('2.0').run() },
    { id: 'open-sources', label: 'Open Sources', action: () => window.dispatchEvent(new CustomEvent('verba:open-cite')) },
  ];

  const filteredCommands = commands.filter(c => 
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  const executeCommand = (cmd: Command) => {
    cmd.action();
    setIsOpen(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      editor.commands.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex]);
      }
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/20 z-[9998]" onClick={() => setIsOpen(false)} />
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[500px] bg-white rounded-xl shadow-2xl z-[9999] border border-border-light overflow-hidden flex flex-col">
        <div className="flex items-center px-4 py-3 border-b border-border-light">
          <Search size={16} className="text-foreground-muted mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-foreground placeholder:text-foreground-muted"
            placeholder="Search commands..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto py-2 px-2">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => executeCommand(cmd)}
                className={`w-full text-left px-3 py-2 text-[13px] rounded-md flex items-center transition-colors ${
                  i === selectedIndex ? 'bg-accent/10 text-accent font-medium' : 'text-foreground hover:bg-black/5'
                }`}
              >
                {cmd.label}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-[13px] text-foreground-muted text-center">No commands found.</div>
          )}
        </div>
      </div>
    </>
  );
}
