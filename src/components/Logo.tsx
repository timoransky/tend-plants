/** App wordmark — an original name/mark (not the spec's "Fields"). */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <span className="text-[22px] leading-none" aria-hidden="true">
        🪴
      </span>
      <span className="text-lg font-semibold tracking-tight text-cream">
        Tend
      </span>
    </span>
  );
}
