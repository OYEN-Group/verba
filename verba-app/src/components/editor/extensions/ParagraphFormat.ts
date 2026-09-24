import { Extension } from '@tiptap/core';

export interface ParagraphFormatOptions {
  types: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphFormat: {
      setParagraphFormat: (attributes: {
        leftIndent?: number;
        rightIndent?: number;
        firstLineIndent?: number;
        spaceBefore?: number;
        spaceAfter?: number;
      }) => ReturnType;
      resetParagraphFormat: () => ReturnType;
    }
  }
}

export const ParagraphFormat = Extension.create<ParagraphFormatOptions>({
  name: 'paragraphFormat',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          leftIndent: {
            default: null,
            parseHTML: element => {
              const val = element.style.marginLeft;
              return val && val.endsWith('px') ? parseInt(val, 10) : null;
            },
            renderHTML: attributes => {
              if (!attributes.leftIndent) return {};
              return { style: `margin-left: ${attributes.leftIndent}px` };
            },
          },
          rightIndent: {
            default: null,
            parseHTML: element => {
              const val = element.style.marginRight;
              return val && val.endsWith('px') ? parseInt(val, 10) : null;
            },
            renderHTML: attributes => {
              if (!attributes.rightIndent) return {};
              return { style: `margin-right: ${attributes.rightIndent}px` };
            },
          },
          firstLineIndent: {
            default: null,
            parseHTML: element => {
              const val = element.style.textIndent;
              return val && val.endsWith('px') ? parseInt(val, 10) : null;
            },
            renderHTML: attributes => {
              if (!attributes.firstLineIndent) return {};
              return { style: `text-indent: ${attributes.firstLineIndent}px` };
            },
          },
          spaceBefore: {
            default: null,
            parseHTML: element => {
              const val = element.style.marginTop;
              return val && val.endsWith('px') ? parseInt(val, 10) : null;
            },
            renderHTML: attributes => {
              if (!attributes.spaceBefore) return {};
              return { style: `margin-top: ${attributes.spaceBefore}px` };
            },
          },
          spaceAfter: {
            default: null,
            parseHTML: element => {
              const val = element.style.marginBottom;
              return val && val.endsWith('px') ? parseInt(val, 10) : null;
            },
            renderHTML: attributes => {
              if (!attributes.spaceAfter) return {};
              return { style: `margin-bottom: ${attributes.spaceAfter}px` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setParagraphFormat: attributes => ({ commands }) => {
        return this.options.types.every(type => commands.updateAttributes(type, attributes));
      },
      resetParagraphFormat: () => ({ commands }) => {
        return this.options.types.every(type => {
          return (
            commands.resetAttributes(type, 'leftIndent') &&
            commands.resetAttributes(type, 'rightIndent') &&
            commands.resetAttributes(type, 'firstLineIndent') &&
            commands.resetAttributes(type, 'spaceBefore') &&
            commands.resetAttributes(type, 'spaceAfter')
          );
        });
      },
    };
  },
});
