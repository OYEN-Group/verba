import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    caption: {
      insertCaption: (options: { captionType: 'figure' | 'table', targetId?: string }) => ReturnType
    }
  }
}

export const Caption = Node.create({
  name: 'caption',

  group: 'block',

  content: 'inline*',

  addAttributes() {
    return {
      captionType: {
        default: 'figure', // 'figure' or 'table'
      },
      targetId: {
        default: null, // the verbaBlockId of the table or figure
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="caption"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'caption',
        class: `verba-caption verba-caption-${HTMLAttributes.captionType}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertCaption: (options) => ({ chain }) => {
        return chain().insertContent({
          type: this.name,
          attrs: options,
        }).run();
      },
    };
  }
});
