import { mergeAttributes, Node } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'

export interface FigureOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      /**
       * Add a figure element
       */
      setFigure: (options: { src: string; alt?: string; title?: string; caption?: string }) => ReturnType
    }
  }
}

export const Figure = Node.create<FigureOptions>({
  name: 'figure',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  group: 'block',

  content: 'inline*',

  draggable: true,

  isolating: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: element => element.querySelector('img')?.getAttribute('src'),
      },
      storagePath: {
        default: null,
        parseHTML: element => element.querySelector('img')?.getAttribute('data-storage-path'),
      },
      assetId: {
        default: null,
      },
      alt: {
        default: null,
        parseHTML: element => element.querySelector('img')?.getAttribute('alt'),
      },
      title: {
        default: null,
        parseHTML: element => element.querySelector('img')?.getAttribute('title'),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        contentElement: 'figcaption',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    let src = HTMLAttributes.src;
    
    // If we have a private storage path, route it through the authenticated proxy
    if (HTMLAttributes.storagePath) {
      src = `/api/assets?path=${encodeURIComponent(HTMLAttributes.storagePath)}`;
    }

    return [
      'figure',
      this.options.HTMLAttributes,
      ['img', mergeAttributes(HTMLAttributes, { src, 'data-storage-path': HTMLAttributes.storagePath, draggable: false, contenteditable: false })],
      ['figcaption', 0],
    ]
  },

  addCommands() {
    return {
      setFigure:
        ({ caption, ...attrs }) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs,
              content: caption ? [{ type: 'text', text: caption }] : [],
            })
            // set cursor inside figcaption
            .command(({ tr, dispatch }) => {
              const { $from } = tr.selection
              const position = $from.pos - 1
              if (dispatch) {
                tr.setSelection(TextSelection.near(tr.doc.resolve(position)))
              }
              return true
            })
            .run()
        },
    }
  },
})
