/**
 * A `<script>` that runs synchronously while the browser parses the HTML —
 * before the JS bundle loads and before React hydrates. Use it for the handful
 * of things that must reflect client-only state (localStorage) at parse time
 * rather than after hydration.
 *
 * `type` is `text/javascript` on the server and `text/plain` on the client, so
 * the script executes exactly once on a hard navigation and is inert when React
 * re-renders it (scripts inserted via DOM updates never execute anyway).
 * `suppressHydrationWarning` covers that deliberate type mismatch, and also
 * keeps React from warning in development about rendering script tags.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
