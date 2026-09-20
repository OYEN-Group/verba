import Image from '@tiptap/extension-image';

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

  renderHTML({ HTMLAttributes }) {
    let src = HTMLAttributes.src;
    
    // If we have a private storage path, route it through the authenticated proxy
    if (HTMLAttributes.storagePath) {
      src = `/api/assets?path=${encodeURIComponent(HTMLAttributes.storagePath)}`;
    }

    const style = [];
    if (HTMLAttributes.width) {
      // If width is numeric, append px, otherwise assume it has units
      const width = isNaN(Number(HTMLAttributes.width)) ? HTMLAttributes.width : `${HTMLAttributes.width}px`;
      style.push(`width: ${width}`);
    }
    
    // Simple alignment using block display
    if (HTMLAttributes.align === 'center') {
      style.push('display: block', 'margin-left: auto', 'margin-right: auto');
    } else if (HTMLAttributes.align === 'right') {
      style.push('display: block', 'margin-left: auto', 'margin-right: 0');
    } else if (HTMLAttributes.align === 'left') {
      style.push('display: block', 'margin-left: 0', 'margin-right: auto');
    }

    return ['img', { ...HTMLAttributes, src, style: style.join('; ') }];
  },
});
