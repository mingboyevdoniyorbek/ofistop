import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { handle, HttpError } from "@/lib/guard";
import { requireStaff, writeAudit } from "@/lib/staff";
import { slugify } from "@/lib/text";

const body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("region"), nameUz: z.string().trim().min(2).max(80), nameRu: z.string().trim().min(2).max(80) }),
  z.object({ kind: z.literal("district"), regionId: z.coerce.number().int(), nameUz: z.string().trim().min(2).max(80), nameRu: z.string().trim().min(2).max(80) }),
]);
export const POST = handle(async (req) => {
  const actor = await requireStaff(req, true);
  const b = body.safeParse(await req.json().catch(() => null));
  if (!b.success) throw new HttpError(422, "Nomlarni o'zbek va rus tilida kiriting");
  const d = db(); const slug = slugify(b.data.nameUz);
  try {
    if (b.data.kind === "region") {
      const [r] = await d.insert(s.regions).values({ slug, nameUz: b.data.nameUz, nameRu: b.data.nameRu }).returning({ id: s.regions.id });
      await writeAudit({ actorId: actor.id, action: "region.create", entityType: "region", entityId: String(r.id), meta: { name: b.data.nameUz } });
    } else {
      const [reg] = await d.select().from(s.regions).where(eq(s.regions.id, b.data.regionId)).limit(1);
      if (!reg) throw new HttpError(422, "Hudud topilmadi");
      const [r] = await d.insert(s.districts).values({ regionId: reg.id, slug, nameUz: b.data.nameUz, nameRu: b.data.nameRu }).returning({ id: s.districts.id });
      await writeAudit({ actorId: actor.id, action: "district.create", entityType: "district", entityId: String(r.id), meta: { name: b.data.nameUz } });
    }
  } catch (e: any) {
    if (e?.code === "23505" || e?.cause?.code === "23505") throw new HttpError(409, "Bunday nom (slug) allaqachon mavjud");
    throw e;
  }
  return NextResponse.json({ ok: true }, { status: 201 });
});
