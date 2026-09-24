import { useCallback, useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
  pageLayoutKey,
  DEFAULT_PAGE_MODEL,
  PageModel,
  getUsableHeight,
  getPageModelFromSectionAttrs,
} from '../components/editor/extensions/PageLayout';

/**
 * Read the padding-top value previously applied to a node via Decoration.node().
 * Used to subtract decoration padding from measured offsetHeight to recover natural height.
 */
function getAppliedPaddingTop(
  decoSet: DecorationSet,
  pos: number,
  nodeSize: number,
): number {
  const found = decoSet.find(pos, pos + nodeSize);
  for (const deco of found) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const style: string = (deco as any).type?.attrs?.style ?? '';
    const m = style.match(/padding-top:\s*(\d+(?:\.\d+)?)px/);
    if (m) return parseFloat(m[1]);
  }
  return 0;
}

export interface PageLayoutResult {
  pageCount: number;
  pageModel: PageModel;
}

/**
 * Presentation-layer pagination hook.
 *
 * Measures rendered block heights after each editor update and dispatches
 * Decoration.node() padding-top values to create visual page gaps.
 *
 * Guarantees:
 *  - ONE Tiptap editor instance, ONE ProseMirror document.
 *  - editor.getJSON() is NEVER modified — decorations are not document content.
 *  - setMeta('addToHistory', false) — pagination never enters undo stack.
 *  - No pagination dispatch fires on selection-only changes.
 *  - Web view clears all decorations immediately.
 */
export function usePageLayout(
  editor: Editor | null,
  viewMode: string,
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
): PageLayoutResult {
  const [pageCount, setPageCount] = useState(1);
  const [pageModel, setPageModel] = useState<PageModel>(DEFAULT_PAGE_MODEL);

  const rafRef     = useRef<number>(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearPagination = useCallback(() => {
    if (!editor) return;
    try {
      editor.view.dispatch(
        editor.view.state.tr
          .setMeta(pageLayoutKey, { decorations: DecorationSet.empty, pageCount: 1 })
          .setMeta('addToHistory', false),
      );
    } catch { /* view destroyed */ }
    setPageCount(1);
    setPageModel(DEFAULT_PAGE_MODEL);
  }, [editor]);

  const runLayout = useCallback(() => {
    if (!editor) return;

    if (viewMode !== 'print') {
      clearPagination();
      return;
    }

    const view  = editor.view;
    const state = editor.state;
    const doc   = state.doc;

    // Resolve page model from first section's stored attributes
    const firstSection = doc.firstChild;
    const model = firstSection
      ? getPageModelFromSectionAttrs(firstSection.attrs as Record<string, unknown>)
      : DEFAULT_PAGE_MODEL;
    setPageModel(model);

    const usableHeight = getUsableHeight(model);

    // Read currently-applied decorations to subtract from measured heights
    const currentDecoSet =
      pageLayoutKey.getState(state)?.decorations ?? DecorationSet.empty;

    const newDecorations: Decoration[] = [];
    let currentPageHeight  = 0;
    let newPageCount       = 1;
    let isFirstContentBlock = true;

    doc.descendants((node, pos, parent) => {
      // Descend into doc and section nodes
      if (node.type.name === 'doc')     return true;
      if (node.type.name === 'section') return true;

      // Only process direct block children of section nodes
      if (!parent || parent.type.name !== 'section') return false;
      if (!node.isBlock) return false;

      // Obtain the DOM element for this block
      let domEl: HTMLElement | null = null;
      try {
        domEl = view.nodeDOM(pos) as HTMLElement | null;
      } catch { return false; }
      if (!domEl || typeof domEl.offsetHeight !== 'number') return false;

      // Natural height = rendered height minus any pagination padding we previously applied.
      // getAppliedPaddingTop reads from the MAPPED decoration set so positions stay correct
      // after document edits (ProseMirror maps decoration positions automatically).
      const appliedPad  = getAppliedPaddingTop(currentDecoSet, pos, node.nodeSize);
      const naturalHeight = Math.max(1, domEl.offsetHeight - appliedPad);

      // ── First content block: apply page 1 top margin ──────────────────────
      if (isFirstContentBlock) {
        newDecorations.push(
          Decoration.node(pos, pos + node.nodeSize, {
            style: `padding-top: ${model.marginTop}px`,
          }),
        );
        currentPageHeight   = naturalHeight;
        isFirstContentBlock = false;
        return false;
      }

      // ── Manual PageBreak: force next content to a new visual page ──────────
      if (node.type.name === 'pageBreak') {
        const remaining = Math.max(0, usableHeight - currentPageHeight);
        // padding = remaining content area + bottom margin + gap + next page top margin
        const pad = remaining + model.marginBottom + model.pageGap + model.marginTop;
        newDecorations.push(
          Decoration.node(pos, pos + node.nodeSize, { style: `padding-top: ${pad}px` }),
        );
        currentPageHeight = 0;
        newPageCount++;
        return false;
      }

      // ── Normal block ────────────────────────────────────────────────────────
      const remaining = usableHeight - currentPageHeight;

      if (naturalHeight > remaining && currentPageHeight > 0) {
        // Block doesn't fit: move it entirely to the next page.
        // v1 decision: block-level pagination only — no line splitting.
        const pad = remaining + model.marginBottom + model.pageGap + model.marginTop;
        newDecorations.push(
          Decoration.node(pos, pos + node.nodeSize, { style: `padding-top: ${pad}px` }),
        );
        currentPageHeight = naturalHeight;
        newPageCount++;
      } else {
        // Block fits — accumulate height.
        currentPageHeight += naturalHeight;

        // Handle content taller than one full usable page (e.g., very large table/image).
        // We count the extra pages consumed without splitting the block.
        if (currentPageHeight > usableHeight) {
          const excess = currentPageHeight - usableHeight;
          const extraPages = Math.ceil(excess / usableHeight);
          newPageCount += extraPages;
          currentPageHeight = excess % usableHeight || usableHeight;
        }
      }

      return false; // Do not recurse into block children
    });

    // ── Dispatch updated decorations ──────────────────────────────────────────
    // setMeta('addToHistory', false) ensures this never enters the undo stack
    // and editor.getJSON() is NEVER affected (decorations are view-layer only).
    const decoSet = DecorationSet.create(doc, newDecorations);
    try {
      view.dispatch(
        view.state.tr
          .setMeta(pageLayoutKey, { decorations: decoSet, pageCount: newPageCount })
          .setMeta('addToHistory', false),
      );
    } catch { /* view destroyed */ }

    setPageCount(newPageCount);
  }, [editor, viewMode, clearPagination]);

  const scheduleLayout = useCallback(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      cancelAnimationFrame(rafRef.current);
      // Run after paint so offsetHeight values are stable
      rafRef.current = requestAnimationFrame(runLayout);
    }, 50);
  }, [runLayout]);

  // Subscribe to content updates (not selection-only changes)
  useEffect(() => {
    if (!editor) return;
    editor.on('update', scheduleLayout);
    scheduleLayout(); // initial layout pass on mount
    return () => {
      editor.off('update', scheduleLayout);
      clearTimeout(debounceRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, [editor, scheduleLayout]);

  // Clear when switching to web view
  useEffect(() => {
    if (viewMode !== 'print') {
      clearPagination();
    }
  }, [viewMode, clearPagination]);

  // ResizeObserver: recalculate when the scroll container width changes
  // (e.g., right panel opens/closes, browser resize)
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(scheduleLayout);
    obs.observe(el);
    return () => obs.disconnect();
  }, [scrollContainerRef, scheduleLayout]);

  return { pageCount, pageModel };
}
