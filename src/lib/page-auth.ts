import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
export async function requireUserPage(path: string) {
  const u = await getCurrentUser().catch(() => null);
  if (!u) redirect(`/kirish?next=${encodeURIComponent(path)}`);
  return u;
}
