import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { Settings2, X } from 'lucide-react';

export function ParagraphPopover({ editor }: { editor: Editor }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // States for format
  const [leftIndent, setLeftIndent] = useState(0);
  const [rightIndent, setRightIndent] = useState(0);
  const [firstLineIndent, setFirstLineIndent] = useState(0);
  const [spaceBefore, setSpaceBefore] = useState(0);
  const [spaceAfter, setSpaceAfter] = useState(0);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const update = () => {
      const attrs = editor.getAttributes('paragraph');
      setLeftIndent(attrs.leftIndent || 0);
      setRightIndent(attrs.rightIndent || 0);
      setFirstLineIndent(attrs.firstLineIndent || 0);
      setSpaceBefore(attrs.spaceBefore || 0);
      setSpaceAfter(attrs.spaceAfter || 0);
    };
    editor.on('selectionUpdate', update);
    editor.on('update', update);
    update();
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('update', update);
    };
  }, [editor, isOpen]);

  const applyFormat = (key: string, value: number) => {
    editor.chain().focus().setParagraphFormat({ [key]: value || undefined }).run();
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 rounded transition-colors flex items-center justify-center min-w-[28px] h-[28px] hover:bg-black/5 text-[#0F172A] ${isOpen ? 'bg-black/5' : ''}`}
        title="Paragraph Settings"
      >
        <Settings2 size={14} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-[#E2E8F0] shadow-lg rounded-md w-72 z-50 p-4 text-[13px] text-[#0F172A]">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold">Paragraph</h4>
            <button onClick={() => setIsOpen(false)} className="opacity-50 hover:opacity-100"><X size={14}/></button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <label className="text-[12px] text-[#475569]">Alignment</label>
              <select 
                className="w-full border border-[#E2E8F0] rounded px-2 py-1 outline-none focus:border-blue-500"
                value={
                  editor.isActive({ textAlign: 'left' }) ? 'left' :
                  editor.isActive({ textAlign: 'center' }) ? 'center' :
                  editor.isActive({ textAlign: 'right' }) ? 'right' :
                  editor.isActive({ textAlign: 'justify' }) ? 'justify' : 'left'
                }
                onChange={(e) => editor.chain().focus().setTextAlign(e.target.value).run()}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
                <option value="justify">Justified</option>
              </select>
            </div>

            <div className="space-y-2">
              <h5 className="font-medium text-[#475569] text-[12px] uppercase">Indentation</h5>
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-[12px] text-[#475569]">Left</label>
                <div className="relative">
                  <input type="number" value={leftIndent} onChange={(e) => applyFormat('leftIndent', Number(e.target.value))} className="w-full border border-[#E2E8F0] rounded px-2 py-1 outline-none focus:border-blue-500 pr-6" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[#64748B]">px</span>
                </div>
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-[12px] text-[#475569]">Right</label>
                <div className="relative">
                  <input type="number" value={rightIndent} onChange={(e) => applyFormat('rightIndent', Number(e.target.value))} className="w-full border border-[#E2E8F0] rounded px-2 py-1 outline-none focus:border-blue-500 pr-6" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[#64748B]">px</span>
                </div>
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-[12px] text-[#475569]">First line/Hanging</label>
                <div className="relative">
                  <input type="number" value={firstLineIndent} onChange={(e) => applyFormat('firstLineIndent', Number(e.target.value))} className="w-full border border-[#E2E8F0] rounded px-2 py-1 outline-none focus:border-blue-500 pr-6" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[#64748B]">px</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="font-medium text-[#475569] text-[12px] uppercase">Spacing</h5>
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-[12px] text-[#475569]">Before</label>
                <div className="relative">
                  <input type="number" value={spaceBefore} onChange={(e) => applyFormat('spaceBefore', Number(e.target.value))} className="w-full border border-[#E2E8F0] rounded px-2 py-1 outline-none focus:border-blue-500 pr-6" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[#64748B]">px</span>
                </div>
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-[12px] text-[#475569]">After</label>
                <div className="relative">
                  <input type="number" value={spaceAfter} onChange={(e) => applyFormat('spaceAfter', Number(e.target.value))} className="w-full border border-[#E2E8F0] rounded px-2 py-1 outline-none focus:border-blue-500 pr-6" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[#64748B]">px</span>
                </div>
              </div>
              <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                <label className="text-[12px] text-[#475569]">Line spacing</label>
                <select 
                  className="w-full border border-[#E2E8F0] rounded px-2 py-1 outline-none focus:border-blue-500"
                  value={editor.getAttributes('paragraph').lineHeight || '1.5'}
                  onChange={(e) => editor.chain().focus().setLineHeight(e.target.value).run()}
                >
                  <option value="1.0">1.0</option>
                  <option value="1.15">1.15</option>
                  <option value="1.5">1.5</option>
                  <option value="2.0">2.0</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
