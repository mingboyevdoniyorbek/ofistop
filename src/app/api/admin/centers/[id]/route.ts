import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, count } from "drizzle-orm";
import { db, schema as s } from "@/db/client";
import { handle, HttpError, isUuid } from "@/lib/guard";
import { requireStaff, writeAudit } from "@/lib/staff";
import { normalizePhoneUz } from "@/lib/text";
import { normalizeTelegram } from "@/lib/listing-input";
import { storeImage, deleteObject, mediaUrl, MAX_IMAGE_BYTES } from "@/lib/storage";
const form = z.object({ name:z.string().trim().min(3).max(120), description:z.string().max(3000), address:z.string().trim().min(5).max(300), regionId:z.coerce.number().int().positive(), districtId:z.coerce.number().int().positive().nullable(), lat:z.string().max(20), lng:z.string().max(20), contactPhone:z.string().max(30), telegramUsername:z.string().max(40), amenities:z.array(z.string()).max(30) });
export const PATCH = handle(async (req,ctx) => {
 const actor = await requireStaff(req,true); const id=(await ctx.params).id;
 if(!isUuid(id)) throw new HttpError(404,"Markaz topilmadi");
 const raw = await req.json().catch(()=>null);
 const deleteKeys:string[]=[];
 const response = await db().transaction(async tx => {
  const [center]=await tx.select().from(s.businessCenters).where(eq(s.businessCenters.id,id)).for("update");
  if(!center) throw new HttpError(404,"Markaz topilmadi");
  if(raw?.action === "delete_image") {
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
export const POST = handle(async (req,ctx) => {
 const actor=await requireStaff(req,true);const id=(await ctx.params).id;
 if(!isUuid(id)) throw new HttpError(404,"Markaz topilmadi");
 if(Number(req.headers.get("content-length")??0)>10*1024*1024) throw new HttpError(413,"Rasm juda katta");
 const data=await req.formData();const file=data.get("file");
 if(!(file instanceof File)||file.size>MAX_IMAGE_BYTES) throw new HttpError(422,"8 MB gacha bitta rasm tanlang");
 let stored:Awaited<ReturnType<typeof storeImage>>|undefined;
 try { return await db().transaction(async tx=>{
  const [c]=await tx.select().from(s.businessCenters).where(eq(s.businessCenters.id,id)).for("update");
  if(!c) throw new HttpError(404,"Markaz topilmadi");
  const [{n}]=await tx.select({n:count()}).from(s.businessCenterImages).where(eq(s.businessCenterImages.centerId,id));
  if(n>=8) throw new HttpError(422,"Ko‘pi bilan 8 ta rasm");
  stored=await storeImage(Buffer.from(await file.arrayBuffer()));
  await tx.insert(s.businessCenterImages).values({centerId:id,storageKey:stored.key,position:n});
  await writeAudit({actorId:actor.id,action:"center.image_add",entityType:"business_center",entityId:id},tx);
  return NextResponse.json({ok:true});
 }); } catch(e) {if(stored) await Promise.all([deleteObject(stored.key),deleteObject(stored.thumbKey)]);throw e;}
});
