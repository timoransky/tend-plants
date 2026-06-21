"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * The app shell ([data-vaul-drawer-wrapper]) is the scroll container, not the
 * document — so Next's built-in scroll-to-top on navigation (which scrolls the
 * window) is a no-op. This restores it: whenever the route changes, send the
 * wrapper back to the top. Drawers are state-driven, not routes, so opening or
 * closing one never triggers this — Home keeps its scroll position behind the
 * sheet.
 */
export function ScrollReset() {
  const pathname = usePathname();
  useEffect(() => {
    document.querySelector("[data-vaul-drawer-wrapper]")?.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
