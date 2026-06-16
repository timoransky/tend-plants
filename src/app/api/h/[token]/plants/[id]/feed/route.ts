import { markCare } from "@/lib/mark-care";

type Params = { params: Promise<{ token: string; id: string }> };

/** POST /api/h/[token]/plants/[id]/feed — set last_fed = now(). */
export async function POST(_request: Request, { params }: Params) {
  const { token, id } = await params;
  return markCare(token, id, "lastFed");
}
