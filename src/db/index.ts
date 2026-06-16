import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

/**
 * Neon serverless (HTTP) driver over the pooled (PgBouncer) connection string.
 * The HTTP driver opens no long-lived sockets, so concurrent serverless
 * invocations won't exhaust Postgres connections. DATABASE_URL must be the
 * Neon `-pooler` endpoint and stays server-side only.
 */
const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });

export { schema };
