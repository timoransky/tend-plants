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
 */
export function Drawer({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Vaul.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <Vaul.Portal>
        <Vaul.Overlay className="fixed inset-0 z-40 bg-scrim/70 backdrop-blur-sm" />
        <Vaul.Content
          className="fixed inset-x-2 bottom-2 z-50 mx-auto flex max-h-[92dvh] w-auto max-w-2xl flex-col rounded-4xl bg-surface text-ink outline-none after:hidden"
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
    </Vaul.Root>
  );
}

/** vaul/Radix Title — required inside an open drawer for its accessible name. */
export const DrawerTitle = Vaul.Title;
/** vaul/Radix Description — optional supporting line under the title. */
export const DrawerDescription = Vaul.Description;
