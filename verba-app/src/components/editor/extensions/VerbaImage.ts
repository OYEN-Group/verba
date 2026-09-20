import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { VerbaImageComponent } from './VerbaImageComponent';

export const VerbaImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      storagePath: {
        default: null,
      },
      assetId: {
        default: null,
      },
      align: {
        default: 'center',
      },
      width: {
        default: null,
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(VerbaImageComponent);
  },
});
