import { Extension } from '@tiptap/core';

export const VerbaStyle = Extension.create({
  name: 'verbaStyle',

  addGlobalAttributes() {
    return [
      {
        types: ['heading', 'paragraph'],
        attributes: {
          verbaStyle: {
            default: null,
            parseHTML: element => element.getAttribute('data-verba-style'),
            renderHTML: attributes => {
              if (!attributes.verbaStyle) {
                return {};
              }
              return {
                'data-verba-style': attributes.verbaStyle,
                class: `verba-style-${attributes.verbaStyle}`
              };
            },
          },
        },
      },
    ];
  },
});
