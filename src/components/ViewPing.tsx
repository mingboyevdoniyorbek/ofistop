"use client";
import { useEffect } from "react";
/** E'lon sahifasi ochilganda ko'rishni bir marta yuboradi (server takrorlarni o'zi chiqarib tashlaydi). */
export default function ViewPing({ id }: { id: string }) {
  useEffect(() => { fetch(`/api/listings/${id}/view`, { method: "POST", keepalive: true }).catch(() => {}); }, [id]);
  return null;
}
