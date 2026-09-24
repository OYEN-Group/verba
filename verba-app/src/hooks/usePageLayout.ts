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


export interface PageLayoutResult {
  pageCount: number;
  pageModel: PageModel;
  currentPage: number;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageModel, setPageModel] = useState<PageModel>(DEFAULT_PAGE_MODEL);

  const rafRef     = useRef<number>(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pageMapRef  = useRef<Map<number, number>>(new Map());

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
    setCurrentPage(1);
    setPageModel(DEFAULT_PAGE_MODEL);
    pageMapRef.current.clear();
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


    const newDecorations: Decoration[] = [];
    let currentPageHeight  = 0;
    let newPageCount       = 1;
    let isFirstContentBlock = true;
    const newPageMap = new Map<number, number>();

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

      // Natural height = rendered height minus any pagination padding currently in the DOM.
      // We read the physical DOM style rather than the Tiptap decoration set to guarantee
      // we only subtract padding that is actually inflating offsetHeight.
      const inlinePad = parseFloat(domEl.style.paddingTop) || 0;
      const naturalHeight = Math.max(1, domEl.offsetHeight - inlinePad);

      // ── First content block: apply page 1 top margin ──────────────────────
      if (isFirstContentBlock) {
        newDecorations.push(
          Decoration.node(pos, pos + node.nodeSize, {
            style: `padding-top: ${model.marginTop}px`,
          }),
        );
        currentPageHeight = naturalHeight;
        isFirstContentBlock = false;

        // Handle if the first block itself is taller than one page
        if (currentPageHeight > usableHeight) {
          const excess = currentPageHeight - usableHeight;
          const extraPages = Math.ceil(excess / usableHeight);
          newPageCount += extraPages;
          currentPageHeight = excess % usableHeight || usableHeight;
        }
        newPageMap.set(pos, newPageCount);
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

        if (currentPageHeight > usableHeight) {
          const excess = currentPageHeight - usableHeight;
          const extraPages = Math.ceil(excess / usableHeight);
          newPageCount += extraPages;
          currentPageHeight = excess % usableHeight || usableHeight;
        }
        newPageMap.set(pos, newPageCount);
      } else {
        // Block fits — accumulate height.
        currentPageHeight += naturalHeight;

        // Handle content taller than one full usable page (e.g., very large table/image).
        if (currentPageHeight > usableHeight) {
          const excess = currentPageHeight - usableHeight;
          const extraPages = Math.ceil(excess / usableHeight);
          newPageCount += extraPages;
          currentPageHeight = excess % usableHeight || usableHeight;
        }
        newPageMap.set(pos, newPageCount);
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

    pageMapRef.current = newPageMap;
    setPageCount(newPageCount);
    updateCurrentPage(newPageMap);
  }, [editor, viewMode, clearPagination]);

  const updateCurrentPage = useCallback((map = pageMapRef.current) => {
    if (!editor) return;
    const { $from } = editor.state.selection;
    let blockPos = 0;
    for (let i = $from.depth; i > 0; i--) {
      const node = $from.node(i);
      if (node.isBlock && $from.node(i - 1)?.type.name === 'section') {
        blockPos = $from.before(i);
        break;
      }
    }
    
    // Fallback: if block not perfectly found, find closest preceding block in map
    if (!map.has(blockPos)) {
       let closest = 1;
       let maxPos = -1;
       for (const [p, pg] of map.entries()) {
         if (p <= $from.pos && p > maxPos) {
           maxPos = p;
           closest = pg;
         }
       }
       setCurrentPage(closest);
    } else {
       setCurrentPage(map.get(blockPos) || 1);
    }
  }, [editor]);

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
    editor.on('selectionUpdate', () => updateCurrentPage());
    scheduleLayout(); // initial layout pass on mount
    return () => {
      editor.off('update', scheduleLayout);
      editor.off('selectionUpdate');
      clearTimeout(debounceRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, [editor, scheduleLayout, updateCurrentPage]);

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

  return { pageCount, pageModel, currentPage };
}
