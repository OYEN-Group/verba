import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { PageModel } from '../editor/extensions/PageLayout';

interface DocumentRulerProps {
  editor: Editor | null;
  pageModel: PageModel;
  zoomLevel: number;
}

export function DocumentRuler({ editor, pageModel, zoomLevel }: DocumentRulerProps) {
  const [leftIndent, setLeftIndent] = useState(0);
  const [firstLineIndent, setFirstLineIndent] = useState(0);
  const [rightIndent, setRightIndent] = useState(0);

  const updateIndents = useCallback(() => {
    if (!editor) return;
    const { selection } = editor.state;
    // Find paragraph attributes for current selection
    // Simplification: just get the first block in selection
    let found = false;
    editor.state.doc.nodesBetween(selection.from, selection.to, (node) => {
      if (!found && (node.type.name === 'paragraph' || node.type.name === 'heading')) {
        setLeftIndent(node.attrs.leftIndent || 0);
        setFirstLineIndent(node.attrs.firstLineIndent || 0);
        setRightIndent(node.attrs.rightIndent || 0);
        found = true;
      }
    });
    if (!found) {
      setLeftIndent(0);
      setFirstLineIndent(0);
      setRightIndent(0);
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.on('selectionUpdate', updateIndents);
    editor.on('update', updateIndents);
    updateIndents();
    return () => {
      editor.off('selectionUpdate', updateIndents);
      editor.off('update', updateIndents);
    };
  }, [editor, updateIndents]);

  const [dragging, setDragging] = useState<'left' | 'firstLine' | 'right' | null>(null);
  const dragStartRef = useRef<{ x: number, initialValue: number } | null>(null);

  const handlePointerDown = (type: 'left' | 'firstLine' | 'right', e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(type);
    let initialValue = 0;
    if (type === 'left') initialValue = leftIndent;
    if (type === 'firstLine') initialValue = firstLineIndent;
    if (type === 'right') initialValue = rightIndent;
    
    dragStartRef.current = { x: e.clientX, initialValue };
  };

  useEffect(() => {
    if (!dragging) return;
    
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStartRef.current) return;
      const deltaX = e.clientX - dragStartRef.current.x;
      // Convert screen px delta to ruler px delta
      const adjustedDelta = deltaX / (zoomLevel / 100);
      
      let newValue = dragStartRef.current.initialValue;
      if (dragging === 'right') {
        newValue = Math.max(0, newValue - adjustedDelta);
      } else if (dragging === 'left') {
        newValue = Math.max(0, newValue + adjustedDelta);
      } else if (dragging === 'firstLine') {
        newValue = newValue + adjustedDelta;
      }
      
      if (dragging === 'right') setRightIndent(newValue);
      else if (dragging === 'left') setLeftIndent(newValue);
      else if (dragging === 'firstLine') setFirstLineIndent(newValue);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!dragStartRef.current) return;
      if (editor) {
        editor.chain().focus().setParagraphFormat({
          leftIndent: leftIndent > 0 ? Math.round(leftIndent) : undefined,
          firstLineIndent: firstLineIndent !== 0 ? Math.round(firstLineIndent) : undefined,
          rightIndent: rightIndent > 0 ? Math.round(rightIndent) : undefined,
        }).run();
      }
      setDragging(null);
      dragStartRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragging, leftIndent, firstLineIndent, rightIndent, zoomLevel, editor]);
  
  const contentWidth = pageModel.pageWidth - pageModel.marginLeft - pageModel.marginRight;

  return (
    <div 
      className="relative flex items-end h-[24px] mb-2 bg-[#F9FAFB] border border-[#E5E7EB] shadow-sm overflow-hidden select-none"
      style={{ width: `${pageModel.pageWidth}px` }}
    >
      {/* Left Margin Area */}
      <div 
        className="absolute h-full bg-[#E5E7EB] opacity-40 border-r border-[#D1D5DB]"
        style={{ width: `${pageModel.marginLeft}px`, left: 0 }}
      />
      
      {/* Right Margin Area */}
      <div 
        className="absolute h-full bg-[#E5E7EB] opacity-40 border-l border-[#D1D5DB]"
        style={{ width: `${pageModel.marginRight}px`, right: 0 }}
      />

      {/* Ticks (every 50px roughly) */}
      <div 
        className="absolute h-[10px] flex text-[#9CA3AF] text-[9px] w-full"
        style={{ left: `${pageModel.marginLeft}px`, width: `${contentWidth}px` }}
      >
        {Array.from({ length: Math.floor(contentWidth / 50) + 1 }).map((_, i) => (
          <div key={i} className="absolute border-l border-[#D1D5DB] h-full" style={{ left: `${i * 50}px` }}>
            <span className="absolute -top-[14px] -left-1">{i > 0 ? i : ''}</span>
          </div>
        ))}
      </div>

      {/* Markers Container */}
      <div 
        className="absolute h-full w-full pointer-events-none"
        style={{ left: `${pageModel.marginLeft}px`, width: `${contentWidth}px` }}
      >
        {/* First Line Indent Marker */}
        <div 
          className="absolute top-0 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-blue-500 pointer-events-auto cursor-ew-resize hover:border-t-blue-600"
          style={{ left: `${leftIndent + firstLineIndent - 5}px` }}
          title="First Line Indent"
          onPointerDown={(e) => handlePointerDown('firstLine', e)}
        />
        
        {/* Left Indent Marker (Bottom) */}
        <div 
          className="absolute bottom-[2px] w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[6px] border-b-blue-500 pointer-events-auto cursor-ew-resize hover:border-b-blue-600"
          style={{ left: `${leftIndent - 5}px` }}
          title="Left Indent"
          onPointerDown={(e) => handlePointerDown('left', e)}
        />
        {/* Left Indent Block */}
        <div 
          className="absolute bottom-0 w-[10px] h-[3px] bg-blue-500 pointer-events-auto cursor-ew-resize hover:bg-blue-600"
          style={{ left: `${leftIndent - 5}px` }}
          onPointerDown={(e) => handlePointerDown('left', e)}
        />

        {/* Right Indent Marker */}
        <div 
          className="absolute bottom-[2px] w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[6px] border-b-blue-500 pointer-events-auto cursor-ew-resize hover:border-b-blue-600"
          style={{ right: `${rightIndent - 5}px` }}
          title="Right Indent"
          onPointerDown={(e) => handlePointerDown('right', e)}
        />
      </div>
    </div>
  );
}
