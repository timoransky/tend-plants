"use client";

import { useEffect } from "react";
import { Drawer as Vaul } from "vaul";

// vaul only neutralises the page's scroll position while a drawer is open on
// Safari (it pins the body with `position: fixed`). Everywhere else the document
// stays scrolled, and vaul's drag-to-dismiss gives up the moment its hit-test
// climbs to a scrollable ancestor whose `scrollTop !== 0` — i.e. the scrolled
// page behind the sheet. The result: after scrolling Home, the opened drawer
// can't be dragged shut, only dismissed by tapping the scrim. We close that gap
// by replicating vaul's Safari lock on the browsers it skips.
const isSafari = () =>
  typeof navigator !== "undefined" &&
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Ref-counted so overlapping locks (e.g. React's dev double-invoke, or a stray
// second non-nested drawer) save/restore the page exactly once.
let lockCount = 0;
let saved: {
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  paddingRight: string;
  scrollX: number;
  scrollY: number;
} | null = null;

function lockPageScroll(): () => void {
  if (lockCount++ === 0) {
    const { body } = document;
    const html = document.documentElement;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    // Pad the html by the now-vanishing scrollbar so the scaled-back page behind
    // the scrim doesn't jump sideways when the body leaves the flow.
    const scrollbar = window.innerWidth - html.clientWidth;
    saved = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      paddingRight: html.style.paddingRight,
      scrollX,
      scrollY,
    };
    // Pin the body at its current scroll offset: the page looks unchanged, but
    // `documentElement.scrollTop` is now 0, so vaul's drag hit-test passes.
    body.style.position = "fixed";
    body.style.top = `${-scrollY}px`;
    body.style.left = `${-scrollX}px`;
    body.style.right = "0";
    body.style.width = "100%";
    if (scrollbar > 0) html.style.paddingRight = `${scrollbar}px`;
  }
  return () => {
    if (--lockCount === 0 && saved) {
      const { body } = document;
      const html = document.documentElement;
      body.style.position = saved.position;
      body.style.top = saved.top;
      body.style.left = saved.left;
      body.style.right = saved.right;
      body.style.width = saved.width;
      html.style.paddingRight = saved.paddingRight;
      window.scrollTo(saved.scrollX, saved.scrollY);
      saved = null;
    }
  };
}

/**
 * The app's bottom-sheet drawer (vaul). It owns the shared chrome — scrim,
 * rounded cream surface, grabber handle and the scrollable body — so every
 * drawer (plant detail, add plant) looks and drags identically. vaul handles
 * drag-to-dismiss, focus trap, scroll lock and accessibility.
 *
 * Consumers compose their own header inside `children` using the re-exported
 * `DrawerTitle` / `DrawerDescription` (vaul requires a Title for the dialog's
 * accessible name). The Root stays mounted across opens; drive visibility with
 * `open` alone rather than conditionally mounting it.
 *
 * Pass `nested` for a drawer opened from inside another drawer (e.g. the edit
 * sheet over plant detail): it uses vaul's `NestedRoot`, which scales the parent
 * sheet back as this one slides up. A nested drawer must be rendered within the
 * parent drawer's React tree.
 */
export function Drawer({
  open,
  onOpenChange,
  nested,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nested?: boolean;
  children: React.ReactNode;
}) {
  // Nested drawers ride their parent's lock; Safari is already handled by vaul.
  useEffect(() => {
    if (nested || !open || isSafari()) return;
    return lockPageScroll();
  }, [nested, open]);

  const Root = nested ? Vaul.NestedRoot : Vaul.Root;
  // A nested drawer must sit entirely above its parent: its scrim has to dim the
  // parent's content (z-50), not slip behind it. So bump the nested layer's
  // overlay/content above the base layer (otherwise both bottom-anchored sheets
  // overlap and read as one surface).
  const overlayZ = nested ? "z-[60]" : "z-40";
  const contentZ = nested ? "z-[70]" : "z-50";
  return (
    <Root
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground
      setBackgroundColorOnScale={false}
    >
      <Vaul.Portal>
        <Vaul.Overlay
          className={`fixed inset-0 ${overlayZ} bg-scrim/40 backdrop-blur-xs`}
        />
        <Vaul.Content
          className={`fixed inset-x-2 bottom-2 ${contentZ} mx-auto flex max-h-[92dvh] w-auto max-w-2xl flex-col rounded-4xl bg-surface text-ink outline-none after:hidden`}
          // The drawer sits 8px above the bottom edge, so push it fully off-screen
          // by that extra gap when closed (otherwise an 8px sliver stays visible).
          style={
            { "--initial-transform": "calc(100% + 8px)" } as React.CSSProperties
          }
        >
          <div
            aria-hidden
            className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-ink/15"
          />
          <div className="min-h-0 flex-1 overflow-x-clip overflow-y-auto px-5 pb-5 pt-3">
            {children}
          </div>
        </Vaul.Content>
      </Vaul.Portal>
    </Root>
  );
}

/** vaul/Radix Title — required inside an open drawer for its accessible name. */
export const DrawerTitle = Vaul.Title;
/** vaul/Radix Description — optional supporting line under the title. */
export const DrawerDescription = Vaul.Description;
