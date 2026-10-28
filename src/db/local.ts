import { PGlite } from "@electric-sql/pglite";
import { resolve } from "node:path";
import { localTestEnabled } from "../lib/test-mode";

const state = globalThis as unknown as { localDatabase?: PGlite };
export function localDatabase() {
  if (!localTestEnabled()) throw new Error("Ichki baza faqat mahalliy test rejimi uchun");
  // Local mutable data must never be traced into a production deployment.
  state.localDatabase ??= new PGlite(resolve(/* turbopackIgnore: true */ ".test-data/database"));
  return state.localDatabase;
}
