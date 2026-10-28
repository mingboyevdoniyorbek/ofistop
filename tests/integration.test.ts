import { beforeAll, afterAll, test, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '../src/db/schema';
import { eq } from 'drizzle-orm';
const state=vi.hoisted(()=>({db:null as any,client:null as any,user:null as any,cookie:new Map<string,string>()}));
vi.mock('../src/db/client',async()=>({db:()=>state.db,queryClient:()=>state.client,getPool:()=>({query:(q:string,p?:unknown[])=>state.client.query(q,p)}),schema:await import('../src/db/schema')}));
vi.mock('next/headers',()=>({cookies:async()=>({get:(k:string)=>state.cookie.has(k)?{value:state.cookie.get(k)}:undefined,set:(k:string,v:string)=>state.cookie.set(k,v),delete:(k:string)=>state.cookie.delete(k)})}));
// Keep real OTP crypto/session creation; only signed-in actor resolution is controlled.
vi.mock('../src/lib/auth',async original=>({...await original<any>(),getCurrentUser:async()=>state.user,getAdminUser:async()=>state.user}));
import { bootstrap } from '../src/db/bootstrap';
import { POST as create } from '../src/app/api/listings/route';
import { PATCH as patch } from '../src/app/api/listings/[id]/route';
import { POST as submit } from '../src/app/api/listings/[id]/submit/route';
import { POST as availability } from '../src/app/api/listings/[id]/availability/route';
import { POST as admin } from '../src/app/api/admin/listings/[id]/route';
import { POST as otp } from '../src/app/api/auth/request-otp/route';
import { POST as verify } from '../src/app/api/auth/verify-otp/route';
import { POST as upload } from '../src/app/api/listings/[id]/images/route';
import { parseFilters, searchListings } from '../src/lib/search';
import { moderate } from '../src/lib/moderation';
import sharp from 'sharp';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
let owner:any,staff:any,id:string,uploadDir:string;
const ctx=(id='')=>({params:Promise.resolve({id})});
const req=(body?:unknown,method='POST')=>new Request('http://localhost/api',{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
beforeAll(async()=>{
 state.client=new PGlite();state.db=drizzle(state.client,{schema});
 for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())await state.client.exec(readFileSync(`drizzle/${file}`,'utf8'));
 process.env.SESSION_SECRET='regression-only-random-test-secret-123456789';process.env.DEV_OTP_ENABLED='true';process.env.SMS_PROVIDER='';Object.assign(process.env,{NODE_ENV:'test'});
 uploadDir=await mkdtemp(join(tmpdir(),'ofisijara-test-'));process.env.UPLOAD_DIR=uploadDir;
},30000);
afterAll(async()=>{await state.client.close();await rm(uploadDir,{recursive:true,force:true});});
test('empty database returns setup error; reference bootstrap is idempotent and creates no users',async()=>{
 [owner]=await state.db.insert(schema.users).values({phone:'+998901112233'}).returning();state.user={...owner,blocked:false};
 expect((await create(req(),ctx())).status).toBe(503);
 await bootstrap();await bootstrap();
 expect((await state.db.select().from(schema.regions)).length).toBe(14);
 expect((await state.db.select().from(schema.users)).length).toBe(1);
 [staff]=await state.db.insert(schema.users).values({phone:'+998901112244',role:'admin'}).returning();
 const response=await create(req(),ctx());expect(response.status).toBe(201);id=(await response.json()).id;
});
test('draft, image upload, submit, approval, contact update remoderation and pending validation',async()=>{
 const body={fields:{title:'Yorug ofis',description:'Metro yonidagi keng va yorug ofis xonasi',address:'Toshkent kochasi 10',areaM2:'50',priceAmount:'500',currency:'USD',contactPhone:'+998901112233'}};
 expect((await patch(req(body,'PATCH'),ctx(id))).status).toBe(200);
 const data=await sharp({create:{width:400,height:300,channels:3,background:'#123456'}}).png().toBuffer();const fd=new FormData();fd.set('files',new File([data],'test.png',{type:'image/png'}));
 const imageRes=await upload(new Request('http://localhost/api',{method:'POST',body:fd}),ctx(id));expect(imageRes.status,JSON.stringify(await imageRes.clone().json())).toBe(200);
 expect((await submit(req(),ctx(id))).status).toBe(200);
 expect((await patch(req({fields:{title:''}},'PATCH'),ctx(id))).status).toBe(422);
 expect((await moderate(id,staff,'approve',undefined,30)).ok).toBe(true);
 const changed=await patch(req({fields:{contactPhone:'+998909998877'}},'PATCH'),ctx(id));expect(changed.status).toBe(200);expect((await changed.json()).remoderation).toBe(true);
 expect((await moderate(id,staff,'approve',undefined,30)).ok).toBe(true);
});
test('moderator block cannot be undone by owner; blocked owner disappears from search',async()=>{
 state.user=staff;expect((await admin(req({action:'hide',reason:'Test moderation'}),ctx(id))).status).toBe(200);
 state.user=owner;expect((await availability(req({action:'set',to:'available'}),ctx(id))).status).toBe(403);
 expect((await searchListings(parseFilters({}))).total).toBe(0);
 state.user=staff;expect((await admin(req({action:'unhide'}),ctx(id))).status).toBe(200);
 expect((await searchListings(parseFilters({}))).total).toBe(1);
 await state.db.update(schema.users).set({isBlocked:true}).where(eq(schema.users.id,owner.id));expect((await searchListings(parseFilters({}))).total).toBe(0);
 await state.db.update(schema.users).set({isBlocked:false}).where(eq(schema.users.id,owner.id));state.user=owner;
});
test('currency alone filters, bad ranges and dates never reach postgres casts',async()=>{
 expect((await searchListings(parseFilters({currency:'USD'}))).total).toBe(1);
 expect((await searchListings(parseFilters({currency:'UZS'}))).total).toBe(0);
 expect((await searchListings(parseFilters({priceMin:'1000',priceMax:'10'}))).total).toBe(0);
 expect((await searchListings(parseFilters({availableBy:'2026-02-31'}))).total).toBe(0);
});
test('stale editor and invalid pending approvals are rejected',async()=>{
 expect((await patch(req({fields:{title:'Other title'},expectedUpdatedAt:'2000-01-01T00:00:00.000Z'},'PATCH'),ctx(id))).status).toBe(409);
 await state.db.update(schema.listings).set({moderationStatus:'pending',title:''}).where(eq(schema.listings.id,id));
 expect((await moderate(id,staff,'approve',undefined,30)).ok).toBe(false);
});
test('test OTP is shown without a network request, sign-in works, code cannot be reused',async()=>{
 const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('No external network allowed'));
 const phone='+998909991122';const response=await otp(req({phone}),ctx());expect(response.status).toBe(200);
 const result=await response.json();expect(result.devMode).toBe(true);expect(result.devCode).toMatch(/^\d{6}$/);
 expect((await verify(req({phone,code:result.devCode}),ctx())).status).toBe(200);expect(state.cookie.get('oi_session')).toBeTruthy();
 expect((await verify(req({phone,code:result.devCode}),ctx())).status).toBe(400);expect(network).not.toHaveBeenCalled();network.mockRestore();
});
test('production refuses dev OTP even if flag is enabled',async()=>{
 Object.assign(process.env,{NODE_ENV:'production'});const r=await otp(req({phone:'+998909991133'}),ctx());expect(r.status).toBe(503);expect(await r.json()).not.toHaveProperty('devCode');Object.assign(process.env,{NODE_ENV:'test'});
});
test('unchanged full form saves do not hide an approved listing',async()=>{
 const {toForm}=await import('../src/lib/listing-input');
 await state.db.update(schema.listings).set({title:'Yorug ofis',moderationStatus:'approved'}).where(eq(schema.listings.id,id));
 const [row]=await state.db.select().from(schema.listings).where(eq(schema.listings.id,id));state.user=owner;
 const r=await patch(req({fields:toForm(row),expectedUpdatedAt:row.updatedAt.toISOString()},'PATCH'),ctx(id));expect(r.status).toBe(200);expect((await r.json()).remoderation).toBe(false);
});
test('confirm cannot smuggle an archive target to bypass suspension',async()=>{
 await state.db.update(schema.listings).set({isSuspended:true}).where(eq(schema.listings.id,id));state.user=owner;
 expect((await availability(req({action:'confirm',to:'archived'}),ctx(id))).status).toBe(403);
 await state.db.update(schema.listings).set({isSuspended:false}).where(eq(schema.listings.id,id));
});
test('center create without district, edit coordinates and amenities, image upload and delete',async()=>{
 const {POST:createCenter}=await import('../src/app/api/admin/centers/route');
 const {PATCH:editCenter,POST:imageCenter}=await import('../src/app/api/admin/centers/[id]/route');
 const [region]=await state.db.select().from(schema.regions);state.user=staff;
 const created=await createCenter(req({name:'Test markaz',address:'Toshkent kochasi 10',regionId:region.id,districtId:''}),ctx());expect(created.status,JSON.stringify(await created.clone().json())).toBe(201);const cid=(await created.json()).id;
 const updated=await editCenter(req({name:'Yangilangan markaz',address:'Toshkent kochasi 20',description:'Tavsif',regionId:region.id,districtId:null,lat:'41.3',lng:'69.2',contactPhone:'+998901112233',telegramUsername:'test_center',amenities:['internet']},'PATCH'),ctx(cid));expect(updated.status).toBe(200);
 const image=await sharp({create:{width:300,height:200,channels:3,background:'#445566'}}).png().toBuffer();const fd=new FormData();fd.set('file',new File([image],'center.png',{type:'image/png'}));
 expect((await imageCenter(new Request('http://localhost/api',{method:'POST',body:fd}),ctx(cid))).status).toBe(200);
 const [im]=await state.db.select().from(schema.businessCenterImages).where(eq(schema.businessCenterImages.centerId,cid));expect(im).toBeTruthy();
 expect((await editCenter(req({action:'delete_image',imageId:im.id},'PATCH'),ctx(cid))).status).toBe(200);
 expect(await state.db.select().from(schema.businessCenterImages).where(eq(schema.businessCenterImages.centerId,cid))).toHaveLength(0);state.user=owner;
});
test('unrelated user cannot update, and archived listings reject image reorder or deletion',async()=>{
 const {PATCH:orderImages}=await import('../src/app/api/listings/[id]/images/route');
 const {DELETE:deleteImage}=await import('../src/app/api/listings/[id]/images/[imageId]/route');
 const [other]=await state.db.insert(schema.users).values({phone:'+998909998888'}).returning();state.user=other;
 expect((await patch(req({fields:{title:'Stolen'}},'PATCH'),ctx(id))).status).toBe(404);state.user=owner;
 await state.db.update(schema.listings).set({availabilityStatus:'archived'}).where(eq(schema.listings.id,id));
 expect((await orderImages(req({},'PATCH'),ctx(id))).status).toBe(409);
 const [image]=await state.db.select().from(schema.listingImages).where(eq(schema.listingImages.listingId,id));
 expect((await deleteImage(req(undefined,'DELETE'),{params:Promise.resolve({id,imageId:image.id})})).status).toBe(409);
});
test('explicit test mode overrides old real-provider credentials',async()=>{
 const original={SMS_PROVIDER:process.env.SMS_PROVIDER,ESKIZ_EMAIL:process.env.ESKIZ_EMAIL,ESKIZ_PASSWORD:process.env.ESKIZ_PASSWORD};
 Object.assign(process.env,{APP_MODE:'test',SMS_PROVIDER:'eskiz',ESKIZ_EMAIL:'old@example.com',ESKIZ_PASSWORD:'old-credential'});
 const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network must not be used'));
 try { const response=await otp(req({phone:'+998909991144'}),ctx());expect(response.status).toBe(200);expect((await response.json()).devMode).toBe(true);expect(network).not.toHaveBeenCalled(); }
 finally {delete process.env.APP_MODE;Object.assign(process.env,original);network.mockRestore();}
});

test('demo login is disabled outside embedded local testing and cannot choose arbitrary users', async () => {
 vi.stubEnv('PROMO_MODE', 'false');
 const { POST: login } = await import('../src/app/api/auth/test-login/route');
 const original = { APP_MODE: process.env.APP_MODE, TEST_DATABASE: process.env.TEST_DATABASE, NODE_ENV: process.env.NODE_ENV };
 try {
  Object.assign(process.env, { APP_MODE: 'test', TEST_DATABASE: 'embedded', NODE_ENV: 'production' });
  expect((await login(req({ account: 'admin' }), ctx())).status).toBe(404);
  Object.assign(process.env, { NODE_ENV: 'test', TEST_DATABASE: 'postgres' });
  expect((await login(req({ account: 'admin' }), ctx())).status).toBe(404);
  Object.assign(process.env, { TEST_DATABASE: 'embedded' });
  expect((await login(req({ account: 'owner', userId: owner.id }), ctx())).status).toBe(400);
  const [demo] = await state.db.insert(schema.users).values({phone:'+998000000010', role:'admin', isDemo:true}).returning();
  expect((await login(req({ account:'admin' }), ctx())).status).toBe(200);
  expect(state.cookie.get('oi_session')).toBeTruthy();
  await state.db.update(schema.users).set({ isBlocked:true }).where(eq(schema.users.id,demo.id));
  expect((await login(req({ account:'admin' }), ctx())).status).toBe(403);
  const crossOrigin = new Request('http://localhost/api', {method:'POST',headers:{origin:'https://other.invalid','content-type':'application/json'},body:JSON.stringify({account:'user'})});
  expect((await login(crossOrigin, ctx())).status).toBe(403);
 } finally {
  vi.unstubAllEnvs();
  for (const [key,value] of Object.entries(original)) { if(value === undefined) delete process.env[key]; else process.env[key]=value; }
 }
});

test('promo guest listings require admin approval, edits and images require reapproval, removal notifies', async () => {
 vi.stubEnv('PROMO_MODE', 'true');
 const previous = state.user;
 const { getCurrentUser: realCurrentUser } = await vi.importActual<typeof import('../src/lib/auth')>('../src/lib/auth');
 const { POST: guest } = await import('../src/app/api/auth/guest/route');
 try {
  state.cookie.clear(); state.user = null;
  expect((await guest(req({phone:owner.phone}),ctx())).status).toBe(200);
  const visitor = await realCurrentUser();
  expect(visitor?.phone).toMatch(/^guest:/); expect(visitor?.id).not.toBe(owner.id); expect(visitor?.role).toBe('user');
  state.user = visitor;
  const draft = await create(req(),ctx()); expect(draft.status).toBe(201); const lid=(await draft.json()).id;
  const [empty]=await state.db.select().from(schema.listings).where(eq(schema.listings.id,lid)); expect(empty.contactPhone).toBeNull();
  expect((await submit(req(),ctx(lid))).status).toBe(422);
  const fields={title:'Promo ofis',description:'Sinov uchun yaratilgan keng va yorug ofis',address:'Toshkent test 10',areaM2:'50',priceAmount:'500',currency:'USD',contactPhone:'+998901112233'};
  expect((await patch(req({fields},'PATCH'),ctx(lid))).status).toBe(200);
  const data=await sharp({create:{width:400,height:300,channels:3,background:'#334455'}}).png().toBuffer();const fd=new FormData();fd.set('files',new File([data],'promo.png',{type:'image/png'}));
  expect((await upload(new Request('http://localhost/api',{method:'POST',body:fd}),ctx(lid))).status).toBe(200);
  const publication=await submit(req(),ctx(lid));expect(publication.status).toBe(200);expect((await publication.json()).moderationStatus).toBe('pending');
  const [pending]=await state.db.select().from(schema.listings).where(eq(schema.listings.id,lid));expect(pending.expiresAt).toBeNull();expect(pending.publishedAt).toBeNull();
  expect((await searchListings(parseFilters({q:'Promo ofis'}))).total).toBe(0);
  expect((await admin(req({action:'approve'}),ctx(lid))).status).toBe(403);
  state.user=staff;
  expect((await admin(req({action:'approve'}),ctx(lid))).status).toBe(200);
  const [published]=await state.db.select().from(schema.listings).where(eq(schema.listings.id,lid));expect(published.expiresAt.getTime()).toBeGreaterThan(Date.now());expect(published.publishedAt).toBeTruthy();
  expect((await searchListings(parseFilters({q:'Promo ofis'}))).total).toBe(1);
  state.user=visitor;
  expect((await patch(req({fields:{priceAmount:'600'}},'PATCH'),ctx(lid))).status).toBe(200);
  expect((await state.db.select().from(schema.listings).where(eq(schema.listings.id,lid)))[0].moderationStatus).toBe('pending');
  expect((await searchListings(parseFilters({q:'Promo ofis'}))).total).toBe(0);
  state.user=staff;expect((await admin(req({action:'approve'}),ctx(lid))).status).toBe(200);
  state.user=visitor;
  const added=await upload(new Request('http://localhost/api',{method:'POST',body:fd}),ctx(lid));expect(added.status).toBe(200);expect((await added.json()).remoderation).toBe(true);
  expect((await searchListings(parseFilters({q:'Promo ofis'}))).total).toBe(0);
  state.user=staff;
  expect((await admin(req({action:'reject',reason:'Rasmni almashtiring'}),ctx(lid))).status).toBe(200);
  state.user=visitor;expect((await submit(req(),ctx(lid))).status).toBe(200);
  expect((await state.db.select().from(schema.listings).where(eq(schema.listings.id,lid)))[0].moderationStatus).toBe('pending');
  state.user=staff;
  expect((await admin(req({action:'remove'}),ctx(lid))).status).toBe(422);
  expect((await admin(req({action:'remove',reason:'Manzil noto‘g‘ri'}),ctx(lid))).status).toBe(200);
  const notices=await state.db.select().from(schema.notifications).where(eq(schema.notifications.userId,visitor!.id));
  expect(notices.some((n:any)=>n.body==='Manzil noto‘g‘ri')).toBe(true);
  expect((await searchListings(parseFilters({q:'Promo ofis'}))).total).toBe(0);
  state.user=visitor;
  expect((await submit(req(),ctx(lid))).status).toBe(403);
  expect((await availability(req({action:'set',to:'available'}),ctx(lid))).status).toBe(403);
  expect((await patch(req({fields:{title:'Attempt to restore'}},'PATCH'),ctx(lid))).status).toBe(409);
  const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('No SMS during promo'));
  expect((await otp(req({phone:'+998901234555'}),ctx())).status).toBe(503);
  expect(network).not.toHaveBeenCalled();network.mockRestore();
 } finally { state.user=previous; vi.unstubAllEnvs(); }
});

test('admin password uses a separate expiring session and password changes invalidate it', async () => {
 vi.stubEnv('APP_MODE','test');vi.stubEnv('TEST_DATABASE','embedded');vi.stubEnv('PROMO_MODE','true');
 const {POST:login,DELETE:logout}=await import('../src/app/api/auth/admin-login/route');
 const actual=await vi.importActual<typeof import('../src/lib/auth')>('../src/lib/auth');
 const publicToken=state.cookie.get('oi_session');
 try {
  expect((await login(req({login:'ofis',password:'wrong'}),ctx())).status).toBe(401);
  expect((await login(req({login:'ofis',password:'ijara'}),ctx())).status).toBe(200);
  expect((await actual.getAdminUser())?.role).toBe('admin');
  expect(state.cookie.get('oi_session')).toBe(publicToken);
  const token=state.cookie.get('oi_admin_session');state.cookie.set('oi_session',token!);
  expect(await actual.getCurrentUser()).toBeNull();
  if(publicToken)state.cookie.set('oi_session',publicToken);else state.cookie.delete('oi_session');
  vi.stubEnv('ADMIN_PASSWORD_HASH','changed');expect(await actual.getAdminUser()).toBeNull();vi.unstubAllEnvs();
  vi.stubEnv('APP_MODE','test');vi.stubEnv('TEST_DATABASE','embedded');
  expect((await logout(req(undefined,'DELETE'),ctx())).status).toBe(200);expect(await actual.getAdminUser()).toBeNull();
 } finally { vi.unstubAllEnvs(); }
});

test('turning promo off requires SMS and preserves guest listings only after successful verification',async()=>{
 const previous=state.user;vi.stubEnv('PROMO_MODE','true');state.cookie.clear();state.user=null;
 const actual=await vi.importActual<typeof import('../src/lib/auth')>('../src/lib/auth');
 const {POST:guest}=await import('../src/app/api/auth/guest/route');
 try {
  expect((await guest(req(),ctx())).status).toBe(200);const visitor=await actual.getCurrentUser();state.user=visitor;
  const response=await create(req(),ctx());expect(response.status).toBe(201);const lid=(await response.json()).id;
  await state.db.insert(schema.notifications).values({userId:visitor!.id,title:'Preserve this notification'});
  vi.stubEnv('PROMO_MODE','false');
  expect((await create(req(),ctx())).status).toBe(401);
  expect((await submit(req(),ctx(lid))).status).toBe(401);
  const phone='+998909991155';const challenge=await otp(req({phone}),ctx());expect(challenge.status).toBe(200);const {devCode}=await challenge.json();
  const wrong=devCode==='000000'?'000001':'000000';expect((await verify(req({phone,code:wrong}),ctx())).status).toBe(400);
  expect((await state.db.select().from(schema.listings).where(eq(schema.listings.id,lid)))[0].ownerId).toBe(visitor!.id);
  expect((await verify(req({phone,code:devCode}),ctx())).status).toBe(200);
  const verified=await actual.getCurrentUser();expect(verified!.phone).toBe(phone);
  expect((await state.db.select().from(schema.listings).where(eq(schema.listings.id,lid)))[0].ownerId).toBe(verified!.id);
  expect((await state.db.select().from(schema.notifications).where(eq(schema.notifications.userId,verified!.id))).some((n:any)=>n.title==='Preserve this notification')).toBe(true);
  const [old]=await state.db.select().from(schema.users).where(eq(schema.users.id,visitor!.id));expect(old.isBlocked).toBe(true);
 }finally{state.user=previous;vi.unstubAllEnvs();}
});
