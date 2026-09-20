import { mergeAttributes, Node } from '@tiptap/core'

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
    return [
      'figure',
      this.options.HTMLAttributes,
      ['img', mergeAttributes(HTMLAttributes, { draggable: false, contenteditable: false })],
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
                tr.setSelection(tr.selection.constructor.near(tr.doc.resolve(position)))
              }
              return true
            })
            .run()
        },
    }
  },
})
