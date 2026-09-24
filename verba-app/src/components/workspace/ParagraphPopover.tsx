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
        <div className="absolute top-full right-0 mt-1 bg-white border border-[#E2E8F0] shadow-lg rounded-md w-64 z-50 p-4 text-[13px] text-[#0F172A]">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold">Paragraph Settings</h4>
            <button onClick={() => setIsOpen(false)} className="opacity-50 hover:opacity-100"><X size={14}/></button>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <h5 className="font-medium text-[#475569] text-[12px] uppercase">Indentation (px)</h5>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-[#64748B] block mb-1">Left</label>
                  <input type="number" value={leftIndent} onChange={(e) => applyFormat('leftIndent', Number(e.target.value))} className="w-full border border-[#E2E8F0] rounded px-2 py-1 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[11px] text-[#64748B] block mb-1">Right</label>
                  <input type="number" value={rightIndent} onChange={(e) => applyFormat('rightIndent', Number(e.target.value))} className="w-full border border-[#E2E8F0] rounded px-2 py-1 outline-none focus:border-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] text-[#64748B] block mb-1">First Line / Hanging (use negative)</label>
                  <input type="number" value={firstLineIndent} onChange={(e) => applyFormat('firstLineIndent', Number(e.target.value))} className="w-full border border-[#E2E8F0] rounded px-2 py-1 outline-none focus:border-blue-500" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="font-medium text-[#475569] text-[12px] uppercase">Spacing (px)</h5>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-[#64748B] block mb-1">Before</label>
                  <input type="number" value={spaceBefore} onChange={(e) => applyFormat('spaceBefore', Number(e.target.value))} className="w-full border border-[#E2E8F0] rounded px-2 py-1 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[11px] text-[#64748B] block mb-1">After</label>
                  <input type="number" value={spaceAfter} onChange={(e) => applyFormat('spaceAfter', Number(e.target.value))} className="w-full border border-[#E2E8F0] rounded px-2 py-1 outline-none focus:border-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
