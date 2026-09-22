// @ts-nocheck
import { Extension } from '@tiptap/core';

export const Indent = Extension.create({
  name: 'indent',
  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      minLevel: 0,
      maxLevel: 8,
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: element => {
              const paddingLeft = element.style.paddingLeft;
              if (paddingLeft && paddingLeft.endsWith('px')) {
                return parseInt(paddingLeft, 10) / 40;
              }
              return 0;
            },
            renderHTML: attributes => {
              if (!attributes.indent) return {};
              return { style: `padding-left: ${attributes.indent * 40}px` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      indent: () => ({ tr, state, dispatch }) => {
        const { selection } = state;
        let trUpdated = tr;
        let indentApplied = false;

        state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            const indent = (node.attrs.indent || 0) + 1;
            if (indent <= this.options.maxLevel) {
              trUpdated = trUpdated.setNodeMarkup(pos, null, { ...node.attrs, indent });
              indentApplied = true;
            }
          }
        });

        if (dispatch && indentApplied) dispatch(trUpdated);
        return indentApplied;
      },
      outdent: () => ({ tr, state, dispatch }) => {
        const { selection } = state;
        let trUpdated = tr;
        let outdentApplied = false;

        state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            const indent = Math.max((node.attrs.indent || 0) - 1, this.options.minLevel);
            trUpdated = trUpdated.setNodeMarkup(pos, null, { ...node.attrs, indent });
            outdentApplied = true;
          }
        });

        if (dispatch && outdentApplied) dispatch(trUpdated);
        return outdentApplied;
      },
    };
  },
});
