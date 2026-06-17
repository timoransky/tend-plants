/**
 * The plant seeder (`GET /api/h/[token]/seed`) is a development convenience for
 * filling a household without adding plants by hand. It's enabled automatically
 * in development; to use it on a deployed instance, set `ENABLE_SEED=1`.
 */
export function seedEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" || process.env.ENABLE_SEED === "1"
  );
}
