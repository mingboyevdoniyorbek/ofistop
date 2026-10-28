import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { drizzle as localDrizzle } from "drizzle-orm/pglite";
import { localDatabase } from "./local";
import { localTestEnabled } from "../lib/test-mode";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

const globalForDb = globalThis as unknown as { pool?: Pool };

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL sozlanmagan");
  globalForDb.pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
  return globalForDb.pool;
}
export const db = (): PgDatabase<PgQueryResultHKT, typeof schema> => localTestEnabled() ? localDrizzle(localDatabase(), { schema }) : drizzle(getPool(), { schema });
export const queryClient = () => ({ query: (text: string, params?: unknown[]) => localTestEnabled() ? localDatabase().query(text, params) : getPool().query(text, params) });
export const closeDb = () => localTestEnabled() ? localDatabase().close() : getPool().end();
export { schema };
