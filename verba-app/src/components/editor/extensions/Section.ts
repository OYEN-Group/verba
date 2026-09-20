import { Node, mergeAttributes } from '@tiptap/core';

export interface SectionOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    section: {
      setSectionColumns: (columns: 1 | 2) => ReturnType;
      setSectionPageSize: (pageSize: 'A4' | 'Letter') => ReturnType;
      setSectionOrientation: (orientation: 'portrait' | 'landscape') => ReturnType;
      setSectionMargins: (margins: 'normal' | 'narrow' | 'wide') => ReturnType;
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
      pageSize: {
        default: 'A4',
        parseHTML: element => element.getAttribute('data-page-size') || 'A4',
        renderHTML: attributes => ({ 'data-page-size': attributes.pageSize }),
      },
      orientation: {
        default: 'portrait',
        parseHTML: element => element.getAttribute('data-orientation') || 'portrait',
        renderHTML: attributes => ({ 'data-orientation': attributes.orientation }),
      },
      margins: {
        default: 'normal',
        parseHTML: element => element.getAttribute('data-margins') || 'normal',
        renderHTML: attributes => ({ 'data-margins': attributes.margins }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'section[data-columns]' },
      { tag: 'section[data-page-size]' },
      { tag: 'section[data-orientation]' },
      { tag: 'section[data-margins]' },
      { tag: 'section.verba-section' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['section', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setSectionColumns: (columns: 1 | 2) => ({ tr, dispatch }) => {
        const { selection } = tr;
        let sectionPos = -1;
        let sectionNode: any = null;
        tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (node.type.name === 'section') {
            sectionPos = pos; sectionNode = node; return false;
          }
          return true;
        });
        if (sectionPos !== -1 && sectionNode) {
          if (dispatch) tr.setNodeMarkup(sectionPos, undefined, { ...sectionNode.attrs, columns });
          return true;
        }
        return false;
      },
      setSectionPageSize: (pageSize: 'A4' | 'Letter') => ({ tr, dispatch }) => {
        const { selection } = tr;
        let sectionPos = -1;
        let sectionNode: any = null;
        tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (node.type.name === 'section') {
            sectionPos = pos; sectionNode = node; return false;
          }
          return true;
        });
        if (sectionPos !== -1 && sectionNode) {
          if (dispatch) tr.setNodeMarkup(sectionPos, undefined, { ...sectionNode.attrs, pageSize });
          return true;
        }
        return false;
      },
      setSectionOrientation: (orientation: 'portrait' | 'landscape') => ({ tr, dispatch }) => {
        const { selection } = tr;
        let sectionPos = -1;
        let sectionNode: any = null;
        tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (node.type.name === 'section') {
            sectionPos = pos; sectionNode = node; return false;
          }
          return true;
        });
        if (sectionPos !== -1 && sectionNode) {
          if (dispatch) tr.setNodeMarkup(sectionPos, undefined, { ...sectionNode.attrs, orientation });
          return true;
        }
        return false;
      },
      setSectionMargins: (margins: 'normal' | 'narrow' | 'wide') => ({ tr, dispatch }) => {
        const { selection } = tr;
        let sectionPos = -1;
        let sectionNode: any = null;
        tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (node.type.name === 'section') {
            sectionPos = pos; sectionNode = node; return false;
          }
          return true;
        });
        if (sectionPos !== -1 && sectionNode) {
          if (dispatch) tr.setNodeMarkup(sectionPos, undefined, { ...sectionNode.attrs, margins });
          return true;
        }
        return false;
      },
    };
  },
});
