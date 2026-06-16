import { markCare } from "@/lib/mark-care";

type Params = { params: Promise<{ token: string; id: string }> };

/** POST /api/h/[token]/plants/[id]/water — set last_watered = now(). */
export async function POST(_request: Request, { params }: Params) {
  const { token, id } = await params;
  return markCare(token, id, "lastWatered");
}
