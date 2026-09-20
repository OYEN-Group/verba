import { Node, mergeAttributes } from '@tiptap/core';

export interface SectionOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    section: {
      setSectionColumns: (columns: 1 | 2) => ReturnType;
    }
  }
}

export const Section = Node.create<SectionOptions>({
  name: 'section',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'verba-section',
      },
    };
  },

  content: 'block+',

  group: 'block',

  // A section should not be parsed as a generic block but should wrap them
  // We define it as the top-level node if we want, or just a block node
  defining: true,

  addAttributes() {
    return {
      columns: {
        default: 1,
        parseHTML: element => {
          const col = element.getAttribute('data-columns');
          return col ? parseInt(col, 10) : 1;
        },
        renderHTML: attributes => {
          return {
            'data-columns': attributes.columns,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'section[data-columns]' },
      { tag: 'section.verba-section' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['section', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setSectionColumns:
        (columns: 1 | 2) =>
        ({ tr, dispatch }) => {
          const { selection } = tr;
          let sectionPos = -1;
          let sectionNode = null;

          // Find the parent section node
          tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (node.type.name === 'section') {
              sectionPos = pos;
              sectionNode = node;
              return false;
            }
            return true;
          });

          if (sectionPos !== -1 && sectionNode) {
            if (dispatch) {
              tr.setNodeMarkup(sectionPos, undefined, {
                ...sectionNode.attrs,
                columns,
              });
            }
            return true;
          }

          return false;
        },
    };
  },
});
