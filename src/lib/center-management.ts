import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, count, sql } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { handle, HttpError, isUuid, type Tx } from "@/lib/guard";
import { writeAudit } from "@/lib/staff";
import { normalizePhoneUz } from "@/lib/text";
import { normalizeTelegram } from "@/lib/listing-input";
import { storeImage, deleteObject, mediaUrl, MAX_IMAGE_BYTES } from "@/lib/storage";
const form = z.object({ tagline:z.string().max(160).default(""), workingHours:z.string().max(120).default(""), website:z.string().max(300).refine(v=>!v || /^https?:\/\//.test(v) && URL.canParse(v)).default(""), name:z.string().trim().min(3).max(120), description:z.string().max(3000), address:z.string().trim().min(5).max(300), regionId:z.coerce.number().int().positive(), districtId:z.coerce.number().int().positive().nullable(), lat:z.string().max(20), lng:z.string().max(20), contactPhone:z.string().max(30), telegramUsername:z.string().max(40), amenities:z.array(z.string()).max(30) });
export function centerHandlers(authorize: (req: Request, id: string) => Promise<{id:string; centerMember?:boolean}>) {
const PATCH = handle(async (req,ctx) => {
 const id=(await ctx.params).id;
 if(!isUuid(id)) throw new HttpError(404,"Markaz topilmadi");
 const actor=await authorize(req,id);
 const raw = await req.json().catch(()=>null);
 const deleteKeys:string[]=[];
 const response = await db().transaction(async tx => {
  await checkMember(actor,id,tx);
  const [center]=await tx.select().from(s.businessCenters).where(eq(s.businessCenters.id,id)).for("update");
  if(!center) throw new HttpError(404,"Markaz topilmadi");
  if(raw?.action === "reorder_images") {
   const images=await tx.select().from(s.businessCenterImages).where(eq(s.businessCenterImages.centerId,id));
   if(!Array.isArray(raw.order) || raw.order.length!==images.length || new Set(raw.order).size!==images.length || raw.order.some((x:unknown)=>!images.some(im=>im.id===x))) throw new HttpError(422,"Markaz maydonlarini tekshiring");
   for(let position=0;position<raw.order.length;position++) await tx.update(s.businessCenterImages).set({position}).where(and(eq(s.businessCenterImages.id,raw.order[position]),eq(s.businessCenterImages.centerId,id)));
  } else if(raw?.action === "delete_image") {
   if(!isUuid(raw.imageId ?? "")) throw new HttpError(400,"Rasm noto‘g‘ri");
   const [im]=await tx.delete(s.businessCenterImages).where(and(eq(s.businessCenterImages.id,raw.imageId),eq(s.businessCenterImages.centerId,id))).returning();
   if(!im) throw new HttpError(404,"Rasm topilmadi"); deleteKeys.push(im.storageKey, im.storageKey.replace(".webp",".thumb.webp"));
  } else {
   const b=form.safeParse(raw); if(!b.success) throw new HttpError(422,"Markaz maydonlarini tekshiring");
   const f=b.data;
   if(!(await tx.select().from(s.regions).where(eq(s.regions.id,f.regionId))).length) throw new HttpError(422,"Hudud topilmadi");
   if(f.districtId && !(await tx.select().from(s.districts).where(and(eq(s.districts.id,f.districtId),eq(s.districts.regionId,f.regionId)))).length) throw new HttpError(422,"Tuman hududga mos emas");
   const lat=f.lat.trim()?Number(f.lat):null, lng=f.lng.trim()?Number(f.lng):null;
   if((lat===null)!==(lng===null) || (lat!==null && (!Number.isFinite(lat)||Math.abs(lat)>90)) || (lng!==null && (!Number.isFinite(lng)||Math.abs(lng)>180))) throw new HttpError(422,"Koordinatalar noto‘g‘ri");
   const phone=f.contactPhone.trim()?normalizePhoneUz(f.contactPhone):null, tg=f.telegramUsername.trim()?normalizeTelegram(f.telegramUsername):null;
   if((f.contactPhone.trim()&&!phone)||(f.telegramUsername.trim()&&!tg)) throw new HttpError(422,"Telefon yoki Telegram noto‘g‘ri");
   const known=new Set((await tx.select().from(s.amenities)).map(x=>x.code));
   if(f.amenities.some(x=>!known.has(x))) throw new HttpError(422,"Qulaylik noto‘g‘ri");
   await tx.update(s.businessCenters).set({...f,lat:lat?.toFixed(6)??null,lng:lng?.toFixed(6)??null,contactPhone:phone,telegramUsername:tg,amenities:[...new Set(f.amenities)]}).where(eq(s.businessCenters.id,id));
  }
  await writeAudit({actorId:actor.id,action:raw?.action === "delete_image"?"center.image_delete":"center.update",entityType:"business_center",entityId:id},tx);
  return NextResponse.json({ok:true});
 });
 await Promise.all(deleteKeys.map(deleteObject));
 return response;
});
const POST = handle(async (req,ctx) => {
 const id=(await ctx.params).id;
 if(!isUuid(id)) throw new HttpError(404,"Markaz topilmadi");
 const actor=await authorize(req,id);
 if(Number(req.headers.get("content-length")??0)>10*1024*1024) throw new HttpError(413,"Rasm juda katta");
 const data=await req.formData();const file=data.get("file");
 if(!(file instanceof File)||file.size>MAX_IMAGE_BYTES) throw new HttpError(422,"8 MB gacha bitta rasm tanlang");
 let stored:Awaited<ReturnType<typeof storeImage>>|undefined;
 try { return await db().transaction(async tx=>{
  await checkMember(actor,id,tx);
  const [c]=await tx.select().from(s.businessCenters).where(eq(s.businessCenters.id,id)).for("update");
  if(!c) throw new HttpError(404,"Markaz topilmadi");
  const [{n,last}]=await tx.select({n:count(),last:sql<number>`coalesce(max(${s.businessCenterImages.position}),-1)::int`}).from(s.businessCenterImages).where(eq(s.businessCenterImages.centerId,id));
  if(n>=8) throw new HttpError(422,"Ko‘pi bilan 8 ta rasm");
  stored=await storeImage(Buffer.from(await file.arrayBuffer()));
  await tx.insert(s.businessCenterImages).values({centerId:id,storageKey:stored.key,position:last+1});
  await writeAudit({actorId:actor.id,action:"center.image_add",entityType:"business_center",entityId:id},tx);
  return NextResponse.json({ok:true});
 }); } catch(e) {if(stored) await Promise.all([deleteObject(stored.key),deleteObject(stored.thumbKey)]);throw e;}
});

return { PATCH, POST };
}
async function checkMember(actor:{id:string;centerMember?:boolean}, id:string, tx:Tx) {
 if(!actor.centerMember) return;
 const [member]=await tx.select().from(s.businessCenterMemberships).where(and(eq(s.businessCenterMemberships.centerId,id),eq(s.businessCenterMemberships.userId,actor.id))).for("share");
 if(!member) throw new HttpError(403,"Ruxsat yo'q");
}
