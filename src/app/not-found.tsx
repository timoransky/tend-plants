import Link from "next/link";

import { buttonSm, tapScale } from "@/lib/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-4xl" aria-hidden>
        🍂
      </span>
      <h1 className="text-balance text-xl font-semibold text-cream">
        Nothing here
      </h1>
      <p className="max-w-xs text-pretty text-sm text-cream-soft">
        This household link may be wrong or no longer active. Check the link, or
        start a new household.
      </p>
      <Link
        href="/"
        className={`${buttonSm} bg-healthy text-canvas ${tapScale} hover:bg-healthy/90`}
      >
        Go to start
      </Link>
    </main>
  );
}
