"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children into document.body (after mount, so SSR stays clean).
 *
 * vaul scales/translates the [data-vaul-drawer-wrapper] element while a drawer
 * is open. A transformed ancestor becomes the containing block for
 * position:fixed descendants, so anything `fixed` left inside the wrapper rides
 * the drawer animation and slides off-screen. Portaling to <body> lifts it out
 * of the wrapper so it stays anchored to the viewport — used by the add-flow
 * action bar and the multi-select bulk bar.
 */
export function BodyPortal({ children }: { children: React.ReactNode }) {
  // false during SSR, true once hydrated — document.body only exists client-side.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return mounted ? createPortal(children, document.body) : null;
}
