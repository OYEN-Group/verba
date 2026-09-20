import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MathEquationComponent } from './MathEquationComponent';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathEquation: {
      /**
       * Insert a math equation block
       */
      insertEquation: () => ReturnType;
    };
  }
}

export const MathEquation = Node.create({
  name: 'mathEquation',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: 'E = mc^2',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="math-equation"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'math-equation' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathEquationComponent);
  },
  
  addCommands() {
    return {
      insertEquation:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { latex: 'E = mc^2' },
          });
        },
    };
  },
});
