import { EntryFallback } from "@/components/EntryFallback";
import { InlineScript } from "@/components/InlineScript";
import { PRIMARY_STORAGE_KEY } from "@/lib/household-storage";

/**
 * Entry point. No landing screen: reuse this browser's saved household, or
 * auto-create one, then redirect to it. The token is the only credential, so
 * remembering it locally is what keeps a returning visitor on their own plants.
 *
 * The redirect happens in an inline script rather than an effect. localStorage is
 * readable the instant the browser parses this page, but an effect can't run
 * until the bundle has downloaded, parsed and hydrated — three steps of pure
 * waiting on the most common path into the app (typing the domain, or launching
 * the installed PWA, which starts here). Redirecting during parse also turns the
 * hop into a real document navigation instead of a client-side one, so the
 * garden can stream its shell.
 *
 * This page reads no request data, so it stays statically prerendered and is
 * served straight from the CDN. Keep it that way — no `cookies()`/`headers()`.
 */
export default function Home() {
  return (
    <>
      {/* First child, so it executes before the rest of the body is parsed.
          `encodeURIComponent` keeps a poisoned localStorage value from breaking
          out of the /h/ path; `replace` adds no history entry, so Back still
          skips past this page as it did before. */}
      <InlineScript
        html={`(function(){try{var t=localStorage.getItem(${JSON.stringify(
          PRIMARY_STORAGE_KEY,
        )});if(t)location.replace("/h/"+encodeURIComponent(t))}catch(e){}})()`}
      />
      <EntryFallback />
    </>
  );
}
