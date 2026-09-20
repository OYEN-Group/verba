import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

export const MathEquationComponent = (props: NodeViewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [latex, setLatex] = useState(props.node.attrs.latex || '');

  const handleUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLatex(e.target.value);
    props.updateAttributes({
      latex: e.target.value,
    });
  };

  return (
    <NodeViewWrapper className="math-equation-wrapper border border-transparent hover:border-border-light/50 rounded-md my-4 flex flex-col items-center relative group">
      <div 
        className="cursor-pointer p-4 w-full flex justify-center min-h-[60px]"
        onClick={() => setIsEditing(true)}
        title="Click to edit equation"
      >
        <BlockMath math={latex || '\\text{Enter equation}'} />
      </div>
      
      {isEditing && (
        <div className="absolute top-full mt-1 bg-white border border-border-light shadow-lg p-2 rounded-md z-10 w-[80%] flex items-center space-x-2">
          <span className="text-[12px] font-bold text-foreground-muted whitespace-nowrap">f(x) = </span>
          <input
            autoFocus
            type="text"
            value={latex}
            onChange={handleUpdate}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                setIsEditing(false);
                props.editor.commands.focus();
              }
            }}
            className="w-full text-[13px] border border-border-light rounded px-2 py-1 outline-none focus:border-accent font-mono bg-background"
            placeholder="E = mc^2"
          />
        </div>
      )}
    </NodeViewWrapper>
  );
};
