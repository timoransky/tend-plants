/**
 * App wordmark — an original name/mark (not the spec's "Fields"). Pass
 * `wordmark={false}` for the brand mark alone, e.g. on the household home where
 * the garden switcher is the title and a second "Tend" would compete with it.
 */
export function Logo({
  className = "",
  wordmark = true,
}: {
  className?: string;
  wordmark?: boolean;
}) {
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <span
        className="text-3xl leading-none"
        // With the wordmark hidden the leaf is the only "Tend" left, so label it;
        // when the wordmark shows, keep it decorative to avoid "Tend Tend".
        aria-label={wordmark ? undefined : "Tend"}
        role={wordmark ? undefined : "img"}
        aria-hidden={wordmark ? "true" : undefined}
      >
        🪴
      </span>
      {wordmark ? (
        <span className="font-display text-xl font-medium text-cream">
          Tend
        </span>
      ) : null}
    </span>
  );
}
