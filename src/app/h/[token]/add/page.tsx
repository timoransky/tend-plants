import Link from "next/link";

// Placeholder — the species browse + snapshot flow lands in step 5.
type Props = { params: Promise<{ token: string }> };

export default async function AddPlantPage({ params }: Props) {
  const { token } = await params;
  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-4xl" aria-hidden>
        🌱
      </span>
      <h1 className="text-xl font-semibold text-cream">Add a plant</h1>
      <p className="max-w-xs text-sm text-cream-soft">
        The browse-and-add flow arrives in the next build step.
      </p>
      <Link
        href={`/h/${token}`}
        className="rounded-full bg-canvas-soft px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-canvas-soft/70"
      >
        ← Back home
      </Link>
    </main>
  );
}
