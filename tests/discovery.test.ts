import { beforeAll, afterAll, test, expect, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq, and } from "drizzle-orm";
import * as schema from "../src/db/schema";
const state=vi.hoisted(()=>({db:null as any,client:null as any,user:null as any}));
vi.mock("../src/db/client",async()=>({db:()=>state.db,queryClient:()=>state.client,schema:await import("../src/db/schema")}));
vi.mock("next/headers",()=>({cookies:async()=>({get:()=>undefined}),headers:async()=>new Headers()}));
vi.mock("../src/lib/auth",()=>({getCurrentUser:async()=>state.user}));
import { bootstrap } from "../src/db/bootstrap";
import { parseFilters, searchListings } from "../src/lib/search";
import { clusterPoints, parseBounds } from "../src/lib/map-clusters";
import { GET as map } from "../src/app/api/map/route";
import { POST as saveSearch, DELETE as deleteSearch } from "../src/app/api/saved-searches/route";
import { checkSavedSearches, canonicalSearch } from "../src/lib/saved-searches";
import { centerStats } from "../src/lib/centers";
import { PATCH as editCenter } from "../src/app/api/centers/[id]/route";
import { POST as createListing } from "../src/app/api/listings/route";
import { maintainAvailability } from "../src/lib/availability-maintenance";
let owner:any,other:any,regionId:number;
const ctx=(id="")=>({params:Promise.resolve({id})});
const request=(body:unknown,method="POST",url="http://localhost/api")=>new Request(url,{method,headers:{"content-type":"application/json"},body:JSON.stringify(body)});
const future=()=>new Date(Date.now()+86400000*30);
const base=(slug:string)=>({ownerId:owner.id,regionId,slug,title:slug,category:"office" as const,posterType:"owner" as const,moderationStatus:"approved" as const,availabilityStatus:"available" as const,expiresAt:future(),publishedAt:new Date(),areaM2:"50",priceAmountMinor:50000n,currency:"USD" as const,pricePeriod:"month" as const,priceBasis:"whole" as const});
beforeAll(async()=>{
 vi.stubEnv("SESSION_SECRET","discovery-tests-only-secret-at-least-32-chars");
 state.client=new PGlite(); state.db=drizzle(state.client,{schema});
 for(const file of readdirSync("drizzle").filter(f=>f.endsWith(".sql")).sort())await state.client.exec(readFileSync(`drizzle/${file}`,"utf8"));
 await bootstrap(); [{id:regionId}]=await state.db.select().from(schema.regions);
 [owner,other]=await state.db.insert(schema.users).values([{phone:"+998901111111"},{phone:"+998902222222"}]).returning(); state.user=owner;
},30000);
afterAll(async()=>{await state.client.close();vi.unstubAllEnvs();});

test("total budget combines whole rent and square metre rent, excludes per-seat, and sorts totals",async()=>{
 await state.db.insert(schema.listings).values([
  {...base("budget-whole"),priceAmountMinor:60000n},
  {...base("budget-m2"),priceAmountMinor:1000n,priceBasis:"per_m2"},
  {...base("budget-seat"),priceAmountMinor:10000n,priceBasis:"per_seat",category:"coworking"},
  {...base("budget-expensive"),priceAmountMinor:1500n,priceBasis:"per_m2"},
 ]);
 const result=await searchListings(parseFilters({q:"budget-",priceMode:"total",currency:"USD",priceMax:"650",sort:"price_asc"}));
 expect(result.items.map(x=>x.slug)).toEqual(["budget-m2","budget-whole"]);
 const reverse=await searchListings(parseFilters({q:"budget-",priceMode:"total",currency:"USD",priceMax:"650",sort:"price_desc"}));
 expect(reverse.items.map(x=>x.slug)).toEqual(["budget-whole","budget-m2"]);
 expect((await searchListings(parseFilters({center:"-".repeat(36)}))).total).toBeGreaterThan(0); // invalid UUID never reaches a PG cast
});
test("map counts all 620 matching listings, filters hidden rows and paginates a building at maximum zoom",async()=>{
 await state.db.insert(schema.listings).values(Array.from({length:620},(_,i)=>({...base(`cluster-${i}`),lat:"41.31",lng:"69.24",exactLocationPublic:true})));
 await state.db.insert(schema.listings).values({...base("cluster-pending"),lat:"41.31",lng:"69.24",moderationStatus:"pending"});
 const url="http://localhost/api/map?q=cluster-&bbox=69,41,70,42&zoom=19";
 const response=await map(new Request(url),ctx()); expect(response.status).toBe(200);
 const data=await response.json(); expect(data.total).toBe(620); expect(data.truncated).toBe(false);expect(data.clusters).toHaveLength(1);expect(data.clusters[0].count).toBe(620);
 const group=await (await map(new Request(url+`&group=${encodeURIComponent(data.clusters[0].id)}&groupPage=2`),ctx())).json();
 expect(group.groupTotal).toBe(620);expect(group.markers).toHaveLength(20);expect(new Set(group.markers.map((m:any)=>m.id)).size).toBe(20);
 const empty=await (await map(new Request(url+"&category=warehouse"),ctx())).json();expect(empty.total).toBe(0);expect(empty.clusters).toEqual([]);
});
test("zoom preserves count and separates distant points; malformed bounds are rejected",()=>{
 const points=Array.from({length:80},(_,i)=>({id:String(i),lat:41.3+i*.001,lng:69.2+i*.001,approx:false}));
 const wide=clusterPoints(points,8),close=clusterPoints(points,17);
 expect(close.length).toBeGreaterThan(wide.length); expect(close.reduce((n,g)=>n+g.count,0)).toBe(80);
 for(const bad of [",41,70,42","70,41,69,42","1,2,3","1,2,NaN,4"]) expect(parseBounds(bad)).toBeUndefined();
});
test("private coordinates are displaced before map and radius filters are applied",async()=>{
 const [l]=await state.db.insert(schema.listings).values({...base("private-geo"),lat:"41.31",lng:"69.24",exactLocationPublic:false}).returning();
 const data=await (await map(new Request("http://localhost/api/map?q=private-geo&zoom=19"),ctx())).json();
 expect(data.markers).toHaveLength(1); expect(data.markers[0].approx).toBe(true);expect([data.markers[0].lat,data.markers[0].lng]).not.toEqual([41.31,69.24]);
 const result=await searchListings(parseFilters({q:"private-geo",lat:String(data.markers[0].lat),lng:String(data.markers[0].lng),radius:"100"}));
 expect(result.items[0].id).toBe(l.id);
 expect((await map(new Request("http://localhost/api/map?zoom=100"),ctx())).status).toBe(400);
});
test("saved searches notify once for newly published matches and cannot be deleted by another user",async()=>{
 state.user=owner;
 expect((await saveSearch(request({name:"My search",query:"q=alert-room&priceMode=total&currency=USD&priceMax=600"}),ctx())).status).toBe(200);
 const [saved]=await state.db.select().from(schema.savedSearches).where(eq(schema.savedSearches.userId,owner.id));
 await state.db.update(schema.savedSearches).set({lastCheckedAt:new Date(Date.now()-120000)}).where(eq(schema.savedSearches.id,saved.id));
 await state.db.insert(schema.listings).values({...base("alert-room"),publishedAt:new Date(Date.now()-1000)});
 expect(await checkSavedSearches(owner.id)).toBe(1);expect(await checkSavedSearches(owner.id)).toBe(0);
 state.user=other;expect((await deleteSearch(new Request(`http://localhost/api/saved-searches?id=${saved.id}`,{method:"DELETE"}),ctx())).status).toBe(200);
 expect(await state.db.select().from(schema.savedSearches).where(eq(schema.savedSearches.id,saved.id))).toHaveLength(1);
 state.user=owner;
 expect((await saveSearch(request({name:"Same search",query:saved.query}),ctx())).status).toBe(200);
 expect(await state.db.select().from(schema.savedSearches).where(eq(schema.savedSearches.userId,owner.id))).toHaveLength(1);
});
test("center representatives can edit only their center and create prefilled rooms; revocation is enforced",async()=>{
 const [a,b]=await state.db.insert(schema.businessCenters).values([{name:"Center A",slug:"center-a",regionId,address:"Tashkent street A",contactPhone:"+998901111111"},{name:"Center B",slug:"center-b",regionId,address:"Tashkent street B"}]).returning();
 await state.db.insert(schema.businessCenterMemberships).values({centerId:a.id,userId:owner.id}); state.user=owner;
 const fields={name:a.name,address:a.address,description:"Own center",tagline:"A place to work",workingHours:"09:00–18:00",website:"https://example.com",regionId,districtId:null,lat:"41.3",lng:"69.2",contactPhone:"+998901111111",telegramUsername:"",amenities:["internet"]};
 expect((await editCenter(request(fields,"PATCH"),ctx(a.id))).status).toBe(200);
 expect((await editCenter(request(fields,"PATCH"),ctx(b.id))).status).toBe(403);
 const response=await createListing(request({centerId:a.id}),ctx());expect(response.status).toBe(201);
 const [room]=await state.db.select().from(schema.listings).where(eq(schema.listings.id,(await response.json()).id));
 expect(room).toMatchObject({centerId:a.id,category:"bc_room",posterType:"business_center",moderationStatus:"draft",publishedAt:null,address:a.address});
 expect((await createListing(request({centerId:b.id}),ctx())).status).toBe(403);
 expect((await editCenter(request({...fields,website:"javascript:alert(1)"},"PATCH"),ctx(a.id))).status).toBe(422);
 await state.db.delete(schema.businessCenterMemberships).where(and(eq(schema.businessCenterMemberships.centerId,a.id),eq(schema.businessCenterMemberships.userId,owner.id)));
 expect((await editCenter(request(fields,"PATCH"),ctx(a.id))).status).toBe(403);
});
test("availability reminder and expiry jobs are idempotent",async()=>{
 const now=new Date();
 const [due]=await state.db.insert(schema.listings).values({...base("reminder-room"),availabilityConfirmedAt:new Date(now.getTime()-8*86400000)}).returning();
 await state.db.insert(schema.listings).values({...base("expired-room"),expiresAt:new Date(now.getTime()-1000)});
 expect(await maintainAvailability(now)).toEqual({expired:1,reminded:1});expect(await maintainAvailability(now)).toEqual({expired:0,reminded:0});
 await state.db.update(schema.listings).set({availabilityConfirmedAt:now}).where(eq(schema.listings.id,due.id));
 expect((await maintainAvailability(now)).reminded).toBe(0);
});

test("saved query canonicalization ignores view and normalizes amenity order; per-user limit is enforced",async()=>{
 expect(canonicalSearch("view=map&page=2&amenities=security,internet&amenities=internet&q=office")).toBe(canonicalSearch("q=office&amenities=internet&amenities=security"));
 state.user=other;
 for(let i=0;i<20;i++) expect((await saveSearch(request({name:`Query ${i}`,query:`q=limit-${i}`}),ctx())).status).toBe(200);
 expect((await saveSearch(request({name:"Too many",query:"q=overflow"}),ctx())).status).toBe(400);
 expect((await saveSearch(request({name:"Already saved",query:"q=limit-0"}),ctx())).status).toBe(200);
 state.user=owner;
});

test("center totals use full rent, exclude pending rooms, and cover reorder rejects foreign and duplicate images",async()=>{
 const [center]=await state.db.insert(schema.businessCenters).values({name:"Gallery center",slug:"gallery-center",regionId,address:"Gallery street 10"}).returning();
 await state.db.insert(schema.businessCenterMemberships).values({centerId:center.id,userId:owner.id});state.user=owner;
 await state.db.insert(schema.listings).values([{...base("center-total-a"),centerId:center.id,priceBasis:"per_m2",priceAmountMinor:1000n},{...base("center-total-b"),centerId:center.id,priceAmountMinor:60000n},{...base("center-hidden"),centerId:center.id,moderationStatus:"pending",priceAmountMinor:100n}]);
 const st=(await centerStats([center.id])).get(center.id)!;expect(st.rooms).toBe(2);expect(st.prices).toEqual([{currency:"USD",period:"month",basis:"whole",min:50000n,max:60000n}]);
 const images=await state.db.insert(schema.businessCenterImages).values([{centerId:center.id,storageKey:"test/first.webp",position:0},{centerId:center.id,storageKey:"test/second.webp",position:1}]).returning();
 expect((await editCenter(request({action:"reorder_images",order:[images[1].id,images[0].id]},"PATCH"),ctx(center.id))).status).toBe(200);
 const [cover]=await state.db.select().from(schema.businessCenterImages).where(eq(schema.businessCenterImages.centerId,center.id)).orderBy(schema.businessCenterImages.position);expect(cover.id).toBe(images[1].id);
 expect((await editCenter(request({action:"reorder_images",order:[images[0].id,images[0].id]},"PATCH"),ctx(center.id))).status).toBe(422);
 expect((await editCenter(request({action:"reorder_images",order:[images[0].id,owner.id]},"PATCH"),ctx(center.id))).status).toBe(422);
});

import { DELETE as deleteListing } from "../src/app/api/listings/[id]/route";
import { purgeStaleDrafts } from "../src/lib/drafts";
test("qoralama: egasi o'chiradi, chop etilgan e'lon o'chmaydi, 7 kundan eski qoralamalar avtomatik o'chadi",async()=>{
 const old=new Date(Date.now()-8*86400000), fresh=new Date(Date.now()-2*86400000);
 const [d1,d2,d3,pub,othersDraft]=await state.db.insert(schema.listings).values([
  {...base("draft-manual"),moderationStatus:"draft",publishedAt:null},
  {...base("draft-old"),moderationStatus:"draft",publishedAt:null,updatedAt:old},
  {...base("draft-fresh"),moderationStatus:"draft",publishedAt:null,updatedAt:fresh},
  {...base("draft-published")},
  {...base("draft-other-owner"),ownerId:other.id,moderationStatus:"draft",publishedAt:null},
 ]).returning();
 expect((await deleteListing(request({},"DELETE"),ctx(d1.id))).status).toBe(200);
 expect((await deleteListing(request({},"DELETE"),ctx(pub.id))).status).toBe(409);
 expect((await deleteListing(request({},"DELETE"),ctx(othersDraft.id))).status).toBe(404);
 expect(await purgeStaleDrafts()).toBe(1);
 const left=new Set((await state.db.select({id:schema.listings.id}).from(schema.listings)).map((r:any)=>r.id));
 expect(left.has(d1.id)).toBe(false); expect(left.has(d2.id)).toBe(false);
 expect(left.has(d3.id)).toBe(true); expect(left.has(pub.id)).toBe(true); expect(left.has(othersDraft.id)).toBe(true);
});

import { POST as applyCenter } from "../src/app/api/center-applications/route";
import { approveApplication, rejectApplication } from "../src/lib/center-applications";
import { reviewCenter } from "../src/lib/center-review";
import { centerPeriodStats, sendMonthlyCenterReports } from "../src/lib/center-report";
import { trServer } from "../src/lib/server-i18n";
test("markaz arizasi: yangi markaz → tasdiq → vakil; claim; rad etish; vakil o'zgarishlari moderatsiyada",async()=>{
 const admin={id:other.id};
 const form={name:"Ariza Plaza",regionId,address:"Amir Temur ko'chasi 1",contactName:"Ali Valiyev",phone:"90 123 45 67",telegramUsername:"@ariza_plaza",floors:"9",freeRooms:"12"};
 // noto'g'ri telefon — maydon xatosi
 const bad=await applyCenter(request({...form,phone:"123"}),ctx()); expect(bad.status).toBe(422); expect((await bad.json()).errors.phone).toBeTruthy();
 const r=await applyCenter(request(form),ctx()); expect(r.status).toBe(201); const {id}=await r.json();
 const [app]=await state.db.select().from(schema.centerApplications).where(eq(schema.centerApplications.id,id));
 expect(app.phone).toBe("+998901234567"); expect(app.telegramUsername).toBe("ariza_plaza"); expect(app.kind).toBe("new");
 const {centerId}=await approveApplication(id,admin,true);
 const [c]=await state.db.select().from(schema.businessCenters).where(eq(schema.businessCenters.id,centerId));
 expect(c.name).toBe("Ariza Plaza"); expect(c.verifiedAt).toBeTruthy(); expect(c.contactPhone).toBe("+998901234567");
 expect((await state.db.select().from(schema.businessCenterMemberships).where(and(eq(schema.businessCenterMemberships.centerId,centerId),eq(schema.businessCenterMemberships.userId,owner.id)))).length).toBe(1);
 const notes=await state.db.select().from(schema.notifications).where(eq(schema.notifications.userId,owner.id));
 expect(notes.some((n:any)=>n.title==="Markazingiz tasdiqlandi: Ariza Plaza")).toBe(true);
 expect(trServer("Markazingiz tasdiqlandi: Ariza Plaza","ru")).toBe("Ваш центр одобрен: Ariza Plaza");
 await expect(approveApplication(id,admin,true)).rejects.toThrow(); // ikkinchi marta tasdiqlanmaydi
 // vakil endi o'z markaziga claim qila olmaydi
 expect((await applyCenter(request({...form,centerId}),ctx())).status).toBe(409);
 // boshqa foydalanuvchi claim qiladi va rad etiladi
 state.user=other;
 const claim=await applyCenter(request({...form,centerId,contactName:"Boshqa odam"}),ctx()); expect(claim.status).toBe(201);
 expect((await applyCenter(request({...form,centerId}),ctx())).status).toBe(409); // takroriy so'rov
 await rejectApplication((await claim.json()).id,admin,"Hujjat yo'q");
 state.user=owner;
 // vakil tahriri: saytda o'zgarmaydi, admin tasdiqlagach qo'llanadi
 const edit={name:"Ariza Plaza Premium",description:"Yangi tavsif",address:c.address,regionId,districtId:null,lat:"",lng:"",contactPhone:"+998901234567",telegramUsername:"",amenities:[],tagline:"",workingHours:"",website:""};
 const pr=await editCenter(request(edit,"PATCH"),ctx(centerId)); expect(pr.status).toBe(200); expect((await pr.json()).pending).toBe(true);
 let [c2]=await state.db.select().from(schema.businessCenters).where(eq(schema.businessCenters.id,centerId));
 expect(c2.name).toBe("Ariza Plaza"); expect(c2.pendingChanges.name).toBe("Ariza Plaza Premium");
 await reviewCenter(centerId,admin,{action:"approve_changes"});
 [c2]=await state.db.select().from(schema.businessCenters).where(eq(schema.businessCenters.id,centerId));
 expect(c2.name).toBe("Ariza Plaza Premium"); expect(c2.pendingChanges).toBeNull();
 await reviewCenter(centerId,admin,{action:"feature",days:30});
 [c2]=await state.db.select().from(schema.businessCenters).where(eq(schema.businessCenters.id,centerId));
 expect(c2.featuredUntil.getTime()).toBeGreaterThan(Date.now()+29*864e5);
 // statistika va oylik hisobot (oyning 1-kuni, bir marta)
 await state.db.insert(schema.viewDays).values({kind:"center",entityId:centerId,day:"2026-10-15",n:7});
 expect((await centerPeriodStats(centerId,"2026-10-01","2026-11-01")).centerViews).toBe(7);
 expect(await sendMonthlyCenterReports(new Date("2026-11-01T00:00:00Z"))).toBeGreaterThan(0);
 expect(await sendMonthlyCenterReports(new Date("2026-11-01T01:00:00Z"))).toBe(0);
 expect(await sendMonthlyCenterReports(new Date("2026-11-02T00:00:00Z"))).toBe(0);
 const report=(await state.db.select().from(schema.notifications).where(eq(schema.notifications.userId,owner.id))).find((n:any)=>n.title==="Oylik hisobot: Ariza Plaza Premium");
 expect(report.body).toContain("10.2026: markaz sahifasi 7 marta");
 expect(trServer(report.body,"ru")).toContain("страница центра — 7 просмотров");
});

import { deleteCenter } from "../src/lib/center-review";
import { GET as notificationsGet } from "../src/app/api/notifications/route";
test("admin markazni o'chiradi: e'lonlar qoladi (markazsiz), vakil va e'lon egasiga bildirishnoma; qo'ng'iroqcha soni",async()=>{
 const [c]=await state.db.insert(schema.businessCenters).values({name:"O'chiriladigan Markaz",slug:"ochiriladigan-markaz",regionId,address:"Test ko'chasi 5"}).returning();
 await state.db.insert(schema.businessCenterMemberships).values({centerId:c.id,userId:other.id});
 const [l]=await state.db.insert(schema.listings).values({...base("in-deleted-center"),centerId:c.id}).returning();
 state.user=owner; const before=(await (await notificationsGet(new Request("http://localhost/api/notifications"),ctx())).json()).unread;
 await deleteCenter(c.id,{id:other.id});
 expect((await state.db.select().from(schema.businessCenters).where(eq(schema.businessCenters.id,c.id))).length).toBe(0);
 const [l2]=await state.db.select().from(schema.listings).where(eq(schema.listings.id,l.id)); expect(l2.centerId).toBeNull();
 expect((await state.db.select().from(schema.businessCenterMemberships).where(eq(schema.businessCenterMemberships.centerId,c.id))).length).toBe(0);
 const after=await (await notificationsGet(new Request("http://localhost/api/notifications"),ctx())).json();
 expect(after.unread).toBe(before+1); expect(after.items[0].title).toBe("Biznes markaz saytdan olib tashlandi: O'chiriladigan Markaz");
 await expect(deleteCenter(c.id,{id:other.id})).rejects.toThrow();
});
