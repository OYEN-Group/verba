export type DocumentStyle = 'normal' | 'title' | 'subtitle' | 'h1' | 'h2' | 'h3' | 'quote';

export interface StyleConfig {
  id: DocumentStyle;
  name: string;
  tagName: string; // The base tiptap node type: 'paragraph', 'heading', 'blockquote'
  level?: number;  // For headings
  className?: string; // Optional CSS classes for custom styling (e.g. Title vs H1)
}

export const DOCUMENT_STYLES: Record<DocumentStyle, StyleConfig> = {
  normal: { id: 'normal', name: 'Normal', tagName: 'paragraph' },
  title: { id: 'title', name: 'Title', tagName: 'heading', level: 1, className: 'verba-style-title' },
  subtitle: { id: 'subtitle', name: 'Subtitle', tagName: 'heading', level: 2, className: 'verba-style-subtitle' },
  h1: { id: 'h1', name: 'Heading 1', tagName: 'heading', level: 1 },
  h2: { id: 'h2', name: 'Heading 2', tagName: 'heading', level: 2 },
  h3: { id: 'h3', name: 'Heading 3', tagName: 'heading', level: 3 },
  quote: { id: 'quote', name: 'Block Quote', tagName: 'blockquote' },
};
