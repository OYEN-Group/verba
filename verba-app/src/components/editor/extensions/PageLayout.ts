import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { DecorationSet } from '@tiptap/pm/view';

export interface PageLayoutPluginState {
  decorations: DecorationSet;
  pageCount: number;
}

export const pageLayoutKey = new PluginKey<PageLayoutPluginState>('pageLayout');

export interface PageModel {
  pageHeight: number;
  pageWidth: number;
  pageGap: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

export const PAGE_MODELS: Record<string, Record<string, PageModel>> = {
  A4: {
    normal: { pageWidth: 740, pageHeight: 1047, pageGap: 20, marginTop: 90, marginBottom: 90, marginLeft: 90, marginRight: 90 },
    narrow: { pageWidth: 740, pageHeight: 1047, pageGap: 20, marginTop: 45, marginBottom: 45, marginLeft: 45, marginRight: 45 },
    wide:   { pageWidth: 740, pageHeight: 1047, pageGap: 20, marginTop: 90, marginBottom: 90, marginLeft: 180, marginRight: 180 },
  },
  Letter: {
    normal: { pageWidth: 760, pageHeight: 984, pageGap: 20, marginTop: 90, marginBottom: 90, marginLeft: 90, marginRight: 90 },
    narrow: { pageWidth: 760, pageHeight: 984, pageGap: 20, marginTop: 45, marginBottom: 45, marginLeft: 45, marginRight: 45 },
    wide:   { pageWidth: 760, pageHeight: 984, pageGap: 20, marginTop: 90, marginBottom: 90, marginLeft: 180, marginRight: 180 },
  },
};

export const DEFAULT_PAGE_MODEL: PageModel = PAGE_MODELS.A4.normal;

export function getUsableHeight(model: PageModel): number {
  return model.pageHeight - model.marginTop - model.marginBottom;
}

export function getPageModelFromSectionAttrs(attrs: Record<string, unknown>): PageModel {
  const pageSize = (attrs?.pageSize as string) || 'A4';
  const margins  = (attrs?.margins  as string) || 'normal';
  return PAGE_MODELS[pageSize]?.[margins] ?? DEFAULT_PAGE_MODEL;
}

export const PageLayout = Extension.create({
  name: 'pageLayout',

  addProseMirrorPlugins() {
    return [
      new Plugin<PageLayoutPluginState>({
        key: pageLayoutKey,

        state: {
          init() {
            return { decorations: DecorationSet.empty, pageCount: 1 };
          },

          apply(tr, prev) {
            const meta = tr.getMeta(pageLayoutKey) as Partial<PageLayoutPluginState> | undefined;
            if (meta) {
              return {
                decorations: meta.decorations ?? prev.decorations,
                pageCount:   meta.pageCount   ?? prev.pageCount,
              };
            }
            return {
              decorations: prev.decorations.map(tr.mapping, tr.doc),
              pageCount:   prev.pageCount,
            };
          },
        },

        props: {
          decorations(state) {
            return pageLayoutKey.getState(state)?.decorations ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
