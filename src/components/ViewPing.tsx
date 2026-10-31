"use client";
import { useEffect } from "react";
/** E'lon sahifasi ochilganda ko'rishni bir marta yuboradi (server takrorlarni o'zi chiqarib tashlaydi). */
export default function ViewPing({ id, kind = "listing" }: { id: string; kind?: "listing" | "center" }) {
  useEffect(() => { fetch(`/api/${kind === "center" ? "centers" : "listings"}/${id}/view`, { method: "POST", keepalive: true }).catch(() => {}); }, [id, kind]);
  return null;
}
