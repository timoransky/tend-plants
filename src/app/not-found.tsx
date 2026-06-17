import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-4xl" aria-hidden>
        🍂
      </span>
      <h1 className="text-xl font-semibold text-cream">Nothing here</h1>
      <p className="max-w-xs text-sm text-cream-soft">
        This household link may be wrong or no longer active. Check the link, or
        start a new household.
      </p>
      <Link
        href="/"
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-primary/90"
      >
        Go to start
      </Link>
    </main>
  );
}
