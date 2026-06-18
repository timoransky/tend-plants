/** App wordmark — an original name/mark (not the spec's "Fields"). */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <span className="text-3xl leading-none" aria-hidden="true">
        🪴
      </span>
      <span className="text-xl font-semibold tracking-tight text-cream">
        Tend
      </span>
    </span>
  );
}
