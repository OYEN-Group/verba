import React, { useState, useRef, useEffect } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

export const VerbaImageComponent = ({ node, updateAttributes, selected }: NodeViewProps) => {
  const { src, storagePath, align, width } = node.attrs;
  const [isResizing, setIsResizing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Real URL logic
  const displaySrc = storagePath ? `/api/assets?path=${encodeURIComponent(storagePath)}` : src;

  // Resizing logic
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (imgRef.current) {
        const rect = imgRef.current.getBoundingClientRect();
        const newWidth = Math.max(50, e.clientX - rect.left);
        updateAttributes({ width: newWidth });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, updateAttributes]);

  return (
    <NodeViewWrapper 
      className={`relative inline-block my-4 ${
        align === 'center' ? 'flex justify-center' : align === 'right' ? 'flex justify-end' : 'flex justify-start'
      }`}
    >
      <div className={`relative inline-block ${selected ? 'ring-2 ring-blue-500' : ''}`}>
        <img
          ref={imgRef}
          src={displaySrc}
          alt={node.attrs.alt || ''}
          style={{ width: width ? (typeof width === 'number' ? `${width}px` : width) : 'auto' }}
          className="max-w-full block"
        />
        
        {/* Resize Handle */}
        {selected && (
          <div
            className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 border border-white cursor-se-resize rounded-sm transform translate-x-1/2 translate-y-1/2"
            onMouseDown={handleMouseDown}
          />
        )}
      </div>

      {/* Contextual Floating Toolbar when selected */}
      {selected && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white shadow-md border rounded p-1 flex space-x-1 z-50">
          <button onClick={() => updateAttributes({ align: 'left' })} className={`p-1 hover:bg-gray-100 rounded ${align === 'left' ? 'bg-gray-200' : ''}`}>
            <AlignLeft size={16} />
          </button>
          <button onClick={() => updateAttributes({ align: 'center' })} className={`p-1 hover:bg-gray-100 rounded ${align === 'center' ? 'bg-gray-200' : ''}`}>
            <AlignCenter size={16} />
          </button>
          <button onClick={() => updateAttributes({ align: 'right' })} className={`p-1 hover:bg-gray-100 rounded ${align === 'right' ? 'bg-gray-200' : ''}`}>
            <AlignRight size={16} />
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
};
