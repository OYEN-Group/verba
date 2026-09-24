import React, { useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { X } from 'lucide-react';

interface PageSetupDialogProps {
  editor: Editor;
  onClose: () => void;
}

export function PageSetupDialog({ editor, onClose }: PageSetupDialogProps) {
  const [pageSize, setPageSize] = useState<'A4' | 'Letter'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [margins, setMargins] = useState<'normal' | 'narrow' | 'wide'>('normal');

  useEffect(() => {
    // Read current settings from the first section in the document
    const firstSection = editor.state.doc.firstChild;
    if (firstSection && firstSection.type.name === 'section') {
      setPageSize(firstSection.attrs.pageSize || 'A4');
      setOrientation(firstSection.attrs.orientation || 'portrait');
      setMargins(firstSection.attrs.margins || 'normal');
    }
  }, [editor]);

  const applyChanges = () => {
    editor.chain().focus()
      .setSectionPageSize(pageSize)
      .setSectionOrientation(orientation)
      .setSectionMargins(margins)
      .run();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <h3 className="font-semibold text-[#0F172A]">Page Setup</h3>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#0F172A]"><X size={16} /></button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#475569] mb-1">Page Size</label>
            <select 
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as any)}
              className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-[14px] outline-none focus:border-blue-500"
            >
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="Letter">Letter (8.5 × 11 in)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-[13px] font-medium text-[#475569] mb-1">Orientation</label>
            <select 
              value={orientation}
              onChange={(e) => setOrientation(e.target.value as any)}
              className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-[14px] outline-none focus:border-blue-500"
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#475569] mb-1">Margins</label>
            <select 
              value={margins}
              onChange={(e) => setMargins(e.target.value as any)}
              className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-[14px] outline-none focus:border-blue-500"
            >
              <option value="normal">Normal</option>
              <option value="narrow">Narrow</option>
              <option value="wide">Wide</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] space-x-2">
          <button onClick={onClose} className="px-4 py-1.5 text-[13px] font-medium text-[#475569] hover:bg-black/5 rounded transition-colors">Cancel</button>
          <button onClick={applyChanges} className="px-4 py-1.5 text-[13px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors shadow-sm">OK</button>
        </div>
      </div>
    </div>
  );
}
