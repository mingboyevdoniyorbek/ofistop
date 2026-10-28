/** Real calendar date, without Date.parse rollover (e.g. February 31). */
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function safeNext(value: string | null, origin: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\x00-\x20]/.test(value)) return "/";
  try { const url = new URL(value, origin); return url.origin === origin ? url.pathname + url.search + url.hash : "/"; }
  catch { return "/"; }
}
