"use client";

import { Drawer as Vaul } from "vaul";

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
