import { mergeAttributes, Node, ReactNodeViewRenderer } from '@tiptap/react';
import { TableOfContentsView } from './TableOfContentsView';

export interface TocEntry {
  id: string;
  text: string;
  level: number;
  pageNumber: number;
}

export const TableOfContents = Node.create({
  name: 'tableOfContents',

  group: 'block',
  
  atom: true, // it's a single unit, content is managed internally

  addAttributes() {
    return {
      entries: {
        default: [],
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="table-of-contents"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'table-of-contents' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableOfContentsView);
  },
});
