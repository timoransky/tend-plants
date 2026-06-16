import { CreateHousehold } from "@/components/CreateHousehold";
import { Logo } from "@/components/Logo";

export default function Landing() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="flex flex-col items-center gap-5 text-center">
        <Logo className="scale-125" />
        <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-cream sm:text-4xl">
          Keep your houseplants happy, together.
        </h1>
        <p className="max-w-md text-base leading-relaxed text-cream-soft">
          Track what needs watering and feeding — shared across your household
          with one secret link. No accounts, no fuss. Whoever has the link is in.
        </p>
      </div>

      <CreateHousehold />
    </main>
  );
}
