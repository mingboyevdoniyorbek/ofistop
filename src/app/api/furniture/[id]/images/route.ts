import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, requireUser, HttpError } from "@/lib/guard";
import { hit } from "@/lib/ratelimit";
import { ImageError, MAX_IMAGE_BYTES } from "@/lib/storage";
import { addFirmImage, removeFirmImage } from "@/lib/furniture";

/** Mebel firmasi rasmlari: logotip (1 ta) va ishlaridan namunalar (2 ta). Faqat firma egasi. */
export const POST = handle(async (req, ctx) => {
  const user = await requireUser(req);
  if (!(await hit(`firmimg:${user.id}`, 30, 3600))) throw new HttpError(429, "Juda ko'p so'rov");
  if (Number(req.headers.get("content-length") ?? 0) > 10 * 1024 * 1024) throw new HttpError(413, "Rasm juda katta");
  const data = await req.formData(); const file = data.get("file"); const slot = data.get("slot");
  if (slot !== "logo" && slot !== "work") throw new HttpError(422, "Rasm turi noto'g'ri");
  if (!(file instanceof File) || file.size > MAX_IMAGE_BYTES) throw new HttpError(422, "8 MB gacha bitta rasm tanlang");
  const key = await addFirmImage((await ctx.params).id, user.id, slot, Buffer.from(await file.arrayBuffer()))
    .catch((e) => { throw e instanceof ImageError ? new HttpError(422, e.message) : e; });
  return NextResponse.json({ ok: true, key }, { status: 201 });
});

export const DELETE = handle(async (req, ctx) => {
  const user = await requireUser(req);
  const b = z.union([z.object({ slot: z.literal("logo") }), z.object({ key: z.string().max(200) })]).safeParse(await req.json().catch(() => null));
  if (!b.success) throw new HttpError(400, "So'rov noto'g'ri");
  await removeFirmImage((await ctx.params).id, user.id, b.data);
  return NextResponse.json({ ok: true });
});
