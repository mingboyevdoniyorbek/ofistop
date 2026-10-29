import { handle, HttpError } from "./guard";

// Drizzle wraps PostgreSQL errors in `cause`. Never log SQL, parameters or tokens.
export function loginFailureCode(error: unknown): string {
  let current = error;
  for (let depth = 0; current && typeof current === "object" && depth < 6; depth++) {
    const e = current as { code?: string; message?: string; cause?: unknown };
    if (e.code === "42P01" || e.code === "42703") return "AUTH_DB_MIGRATION_REQUIRED";
    if (e.code === "28P01" || e.code === "28000") return "AUTH_DB_CREDENTIALS";
    if (e.code === "3D000") return "AUTH_DB_NOT_FOUND";
    if (["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET", "EHOSTUNREACH"].includes(e.code ?? "")) return "AUTH_DB_CONNECTION";
    if (e.message?.startsWith("DATABASE_URL")) return "AUTH_DATABASE_URL_MISSING";
    if (e.message?.startsWith("SESSION_SECRET")) return "AUTH_SESSION_SECRET_INVALID";
    current = e.cause;
  }
  return "AUTH_SERVER_ERROR";
}

export function handleLogin(operation: string, fn: (req: Request) => Promise<Response>) {
  return handle(async req => {
    try { return await fn(req); }
    catch (error) {
      if (error instanceof HttpError) throw error;
      const code = loginFailureCode(error);
      console.error(`[auth:${operation}] ${code}`);
      throw new HttpError(503, "Kirish xizmati vaqtincha ishlamayapti. Keyinroq urinib ko'ring.", { code });
    }
  });
}
