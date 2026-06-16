/** App wordmark — an original name/mark (not the spec's "Fields"). */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="text-healthy"
      >
        <path
          d="M12 21c0-6 0-9 3-12 2-2 5-2 6-2 0 1 0 4-2 6-3 3-6 3-7 3Z"
          fill="currentColor"
          opacity="0.9"
        />
        <path
          d="M12 21c0-5-1-8-4-10C6 9.5 3.5 9.5 3 9.5c0 1 .3 3.5 2 5 2.5 2.2 6 2.5 7 2.5Z"
          fill="currentColor"
          opacity="0.55"
        />
        <path
          d="M12 21v-7"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-lg font-semibold tracking-tight text-cream">
        Tend
      </span>
    </span>
  );
}
