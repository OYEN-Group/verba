import { Node, mergeAttributes } from '@tiptap/core';

export interface PageBreakOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType;
    }
  }
}

export const PageBreak = Node.create<PageBreakOptions>({
  name: 'pageBreak',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'page-break',
      },
    };
  },

  group: 'block',

  parseHTML() {
    return [
      { tag: 'hr.page-break' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['hr', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain }) => {
          return chain()
            .insertContent({ type: this.name })
            .run();
        },
    };
  },
});
