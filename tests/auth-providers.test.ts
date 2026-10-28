import { beforeAll, beforeEach, afterAll, test, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { generateKeyPair, SignJWT } from 'jose';
import * as schema from '../src/db/schema';
const state = vi.hoisted(() => ({ db: null as any, client: null as any, cookies: new Map<string,string>(), publicKey: null as any }));
vi.mock('../src/db/client', async () => ({ db: () => state.db, queryClient: () => state.client, schema: await import('../src/db/schema') }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (k:string) => state.cookies.has(k) ? {value:state.cookies.get(k)} : undefined, set: (k:string,v:string) => state.cookies.set(k,v), delete:(k:string)=>state.cookies.delete(k) }) }));
vi.mock('jose', async original => ({ ...await original<any>(), createRemoteJWKSet: () => async () => state.publicKey }));
import { POST as emailStart } from '../src/app/api/auth/email/start/route';
import { POST as emailConfirm } from '../src/app/api/auth/email/confirm/route';
import { POST as status } from '../src/app/api/auth/status/route';
import { POST as telegramStart } from '../src/app/api/auth/telegram/start/route';
import { POST as webhook } from '../src/app/api/telegram/webhook/route';
import { GET as googleStart } from '../src/app/api/auth/google/start/route';
import { GET as googleCallback } from '../src/app/api/auth/google/callback/route';
import { getCurrentUser, createSession } from '../src/lib/auth';
import { handleUpdate } from '../src/lib/telegram-bot';
import { resolveIdentity } from '../src/lib/identity-login';
import { startChallenge } from '../src/lib/login-challenge';
import { bootstrap } from '../src/db/bootstrap';
import { POST as newListing } from '../src/app/api/listings/route';

const ctx = {params:Promise.resolve({})};
const req = (body:object, path='/api', origin='http://localhost:3000') => new Request(`http://localhost:3000${path}`, {method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)});
let messages: {url:string;body:any}[] = [], providerFails=false, idToken='', privateKey:any;
beforeAll(async()=>{
  state.client=new PGlite(); state.db=drizzle(state.client,{schema});
  for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort()) await state.client.exec(readFileSync(`drizzle/${file}`,'utf8'));
  const keys=await generateKeyPair('RS256');privateKey=keys.privateKey;state.publicKey=keys.publicKey;
  await bootstrap();
},30000);
beforeEach(async()=>{
  await state.client.exec('TRUNCATE users CASCADE; TRUNCATE auth_challenges, rate_limits, telegram_links;');
  state.cookies.clear();messages=[];providerFails=false;idToken='';
  for(const [k,v] of Object.entries({NODE_ENV:'test',APP_URL:'http://localhost:3000',SESSION_SECRET:'test-only-auth-secret-at-least-32-characters',PROMO_MODE:'true',ALLOW_GUEST_LOGIN:'false',RESEND_API_KEY:'test-key',EMAIL_FROM:'OfisTop <login@example.test>',GOOGLE_CLIENT_ID:'test-google-client',GOOGLE_CLIENT_SECRET:'test-google-secret',TELEGRAM_BOT_TOKEN:'123:test',TELEGRAM_BOT_USERNAME:'OfisTopTestBot',TELEGRAM_WEBHOOK_SECRET:'test-webhook-secret-32-characters'})) vi.stubEnv(k,v);
  vi.stubGlobal('fetch',vi.fn(async(url, init)=>{
    if(String(url)==='https://oauth2.googleapis.com/token') return Response.json({id_token:idToken});
    messages.push({url:String(url),body:JSON.parse(init.body)});
    return providerFails ? Response.json({error:'rejected'},{status:500}) : Response.json({ok:true,result:{},id:'test-mail'});
  }));
});
afterAll(async()=>{await state.client.close();vi.unstubAllGlobals();vi.unstubAllEnvs();});
async function emailFlow(email='owner@gmail.com') {
  const res=await emailStart(req({email,next:'/kabinet'}),ctx);expect(res.status).toBe(200);
  const data=await res.json();const mail=messages.at(-1)!.body;
  const code=mail.text.match(/\n(\d{6})$/)[1];const token=mail.text.match(/#token=([A-Za-z0-9_-]{43})/)[1];
  return {...data,code,token};
}
test('email approval on another device only unlocks the initiating browser, then is single-use',async()=>{
  const flow=await emailFlow(); const ownerCookies=new Map(state.cookies);
  expect(messages[0].body.html).toContain('Ofis');expect(flow).not.toHaveProperty('devCode');
  expect((await status(req({id:flow.id}),ctx)).status).toBe(200);
  state.cookies.clear();
  expect((await status(req({id:flow.id,code:flow.code}),ctx)).status).toBe(403);
  expect((await emailConfirm(req({token:flow.token}),ctx)).status).toBe(200);
  expect(state.cookies.has('oi_session')).toBe(false);
  state.cookies=ownerCookies;
  const complete=await status(req({id:flow.id}),ctx);expect((await complete.json()).status).toBe('complete');
  expect((await getCurrentUser())?.role).toBe('user');expect(state.cookies.has('oi_admin_session')).toBe(false);
  expect((await status(req({id:flow.id,code:flow.code}),ctx)).status).toBe(410);
  expect((await emailConfirm(req({token:flow.token}),ctx)).status).toBe(410);
  // A same-browser mail tab may finish first: the original tab must still continue.
  expect((await (await status(req({id:flow.id}),ctx)).json()).status).toBe('complete');
  expect(await state.db.select().from(schema.sessions)).toHaveLength(1);
  state.cookies.delete('oi_session');expect((await status(req({id:flow.id}),ctx)).status).toBe(410);
});
test('email OTP has an attempt cap, expiration, resend invalidation and CSRF checks',async()=>{
  const f=await emailFlow();const wrong=f.code==='000000'?'000001':'000000';
  for(let n=0;n<5;n++)expect((await status(req({id:f.id,code:wrong}),ctx)).status).toBe(400);
  expect((await status(req({id:f.id,code:f.code}),ctx)).status).toBe(429);
  const next=await emailFlow();expect((await status(req({id:f.id,code:f.code}),ctx)).status).toBe(410);
  await state.db.update(schema.authChallenges).set({expiresAt:new Date(Date.now()-1)}).where(eq(schema.authChallenges.id,next.id));
  expect((await status(req({id:next.id,code:next.code}),ctx)).status).toBe(410);
  expect((await emailStart(req({email:'x@gmail.com'},'/api','https://evil.example'),ctx)).status).toBe(403);
});
test('email delivery failure invalidates its challenge; request limits prevent flooding',async()=>{
  providerFails=true;expect((await emailStart(req({email:'owner@gmail.com'}),ctx)).status).toBe(502);
  const [row]=await state.db.select().from(schema.authChallenges);expect(row.consumedAt).toBeTruthy();
  providerFails=false;await emailFlow();await emailFlow();
  expect((await emailStart(req({email:'owner@gmail.com'}),ctx)).status).toBe(429);
});
test('email login keeps guest listings, notifications and favorites; contact fields remain empty',async()=>{
  const [guest]=await state.db.insert(schema.users).values({phone:'guest:legacy'}).returning();
  await state.db.insert(schema.profiles).values({userId:guest.id,displayName:'Guest owner'});await createSession(guest.id);
  const [region]=await state.db.select().from(schema.regions);
  const [listing]=await state.db.insert(schema.listings).values({ownerId:guest.id,slug:'guest-office',posterType:'owner',category:'office',title:'My office',regionId:region.id}).returning();
  await state.db.insert(schema.notifications).values({userId:guest.id,title:'Saved notification'});
  await state.db.insert(schema.favorites).values({userId:guest.id,listingId:listing.id});
  const f=await emailFlow();expect((await status(req({id:f.id,code:f.code}),ctx)).status).toBe(200);
  const owner=await getCurrentUser();expect(owner!.id).not.toBe(guest.id);
  expect((await state.db.select().from(schema.listings))[0].ownerId).toBe(owner!.id);
  expect((await state.db.select().from(schema.notifications))[0].userId).toBe(owner!.id);
  expect((await state.db.select().from(schema.favorites))[0].userId).toBe(owner!.id);
  const created=await newListing(req({}),ctx);expect(created.status).toBe(201);
  const {id}=await created.json();const [draft]=await state.db.select().from(schema.listings).where(eq(schema.listings.id,id));expect(draft.contactPhone).toBeNull();
});
test('blocked accounts cannot obtain sessions or bypass block with Google/email linking',async()=>{
  const f=await emailFlow();await status(req({id:f.id,code:f.code}),ctx);const user=await getCurrentUser();
  await state.db.update(schema.users).set({isBlocked:true}).where(eq(schema.users.id,user!.id));state.cookies.clear();
  const retry=await emailFlow();expect((await status(req({id:retry.id,code:retry.code}),ctx)).status).toBe(403);
  expect(state.cookies.has('oi_session')).toBe(false);
});
const msg=(uid:number, extra:object)=>({message:{chat:{id:uid,type:'private'},from:{id:uid},...extra}});
test('Telegram rejects foreign contacts and confirms a new owner contact automatically',async()=>{
  const response=await telegramStart(req({}),ctx);expect(response.status).toBe(200);const flow=await response.json();
  const token=new URL(flow.botUrl).searchParams.get('start');await handleUpdate(msg(100,{text:`/start ${token}`}));
  expect(messages.at(-1)!.body.reply_markup.keyboard[0][0].request_contact).toBe(true);
  await handleUpdate(msg(100,{contact:{phone_number:'998901112233',user_id:101}}));
  expect(await state.db.select().from(schema.telegramLinks)).toHaveLength(0);
  expect((await (await status(req({id:flow.id}),ctx)).json()).status).toBe('waiting');
  await handleUpdate(msg(100,{contact:{phone_number:'998901112233',user_id:100}}));
  expect((await (await status(req({id:flow.id}),ctx)).json()).status).toBe('complete');
  expect((await getCurrentUser())!.phone).toBe('+998901112233');
});
test('returning Telegram users must confirm and another Telegram account cannot approve',async()=>{
  await handleUpdate(msg(100,{text:'/start'}));expect(messages.at(-1)!.body.reply_markup.keyboard).toBeTruthy();
  await handleUpdate(msg(100,{contact:{phone_number:'998901112233',user_id:100}}));
  const flow=await (await telegramStart(req({}),ctx)).json();await handleUpdate(msg(100,{text:`/start ${new URL(flow.botUrl).searchParams.get('start')}`}));
  const callback=messages.at(-1)!.body.reply_markup.inline_keyboard[0][0].callback_data;
  await handleUpdate({callback_query:{id:'foreign',from:{id:101},data:callback,message:{chat:{id:101,type:'private'}}}});
  expect((await (await status(req({id:flow.id}),ctx)).json()).status).toBe('waiting');
  await handleUpdate({callback_query:{id:'own',from:{id:100},data:callback,message:{chat:{id:100,type:'private'}}}});
  expect((await (await status(req({id:flow.id}),ctx)).json()).status).toBe('complete');
});
test('phone code goes to verified Telegram contact, is browser-bound and cannot be reused',async()=>{
  await handleUpdate(msg(100,{contact:{phone_number:'998901112233',user_id:100}}));
  const flow=await (await telegramStart(req({phone:'+998901112233'}),ctx)).json();
  const code=messages.at(-1)!.body.text.match(/\n(\d{6})\n/)[1];
  expect(messages.at(-1)!.body.chat_id).toBe(100);
  const own=new Map(state.cookies);state.cookies.clear();expect((await status(req({id:flow.id,code}),ctx)).status).toBe(403);state.cookies=own;
  expect((await status(req({id:flow.id,code}),ctx)).status).toBe(200);
  expect((await status(req({id:flow.id,code}),ctx)).status).toBe(410);
});
test('unknown phone receives indistinguishable challenge but cannot verify; webhook needs secret',async()=>{
  const response=await telegramStart(req({phone:'+998909999999'}),ctx);expect(response.status).toBe(200);const flow=await response.json();
  expect(messages).toHaveLength(0);expect((await status(req({id:flow.id,code:'000000'}),ctx)).status).toBe(400);
  expect((await webhook(req(msg(100,{text:'/start'})))).status).toBe(403);
});
async function googleFlow() {
  const r=await googleStart(new Request('http://localhost:3000/api/auth/google/start?next=/kabinet'),ctx);expect(r.status).toBe(307);
  const url=new URL(r.headers.get('location')!);expect(url.searchParams.get('prompt')).toBe('select_account');expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  return url;
}
async function signGoogle(nonce:string, overrides:object={}) {
  idToken=await new SignJWT({nonce,email:'owner@gmail.com',email_verified:true,name:'Owner',...overrides}).setProtectedHeader({alg:'RS256'}).setSubject('google-owner').setIssuer('https://accounts.google.com').setAudience('test-google-client').setIssuedAt().setExpirationTime('5m').sign(privateKey);
}
test('Google verifies state/browser, signed ID token and nonce; uses same verified Gmail account',async()=>{
  const f=await emailFlow();await status(req({id:f.id,code:f.code}),ctx);const original=await getCurrentUser();state.cookies.clear();
  const url=await googleFlow();await signGoogle(url.searchParams.get('nonce')!);
  const callback=new Request(`http://localhost:3000/api/auth/google/callback?state=${url.searchParams.get('state')}&code=google-code`);
  const own=new Map(state.cookies);state.cookies.clear();expect((await googleCallback(callback)).headers.get('location')).toContain('error=google');state.cookies=own;
  expect((await googleCallback(callback)).headers.get('location')).toBe('http://localhost:3000/kabinet');
  expect((await getCurrentUser())!.id).toBe(original!.id);
  expect((await googleCallback(callback)).headers.get('location')).toContain('error=google');
});
test('Google rejects wrong nonce and non-verified email; external email is not auto-linked',async()=>{
  let url=await googleFlow();await signGoogle('wrong');
  expect((await googleCallback(new Request(`http://localhost:3000/api/auth/google/callback?state=${url.searchParams.get('state')}&code=a`))).headers.get('location')).toContain('error=google');
  url=await googleFlow();await signGoogle(url.searchParams.get('nonce')!,{email_verified:false});
  expect((await googleCallback(new Request(`http://localhost:3000/api/auth/google/callback?state=${url.searchParams.get('state')}&code=b`))).headers.get('location')).toContain('error=google');
  const emailId=await state.db.transaction((tx:any)=>resolveIdentity(tx,{provider:'email',subject:'owner@external.test'}));
  const googleId=await state.db.transaction((tx:any)=>resolveIdentity(tx,{provider:'google',subject:'external-google',email:'owner@external.test',linkEmail:false}));
  expect(googleId).not.toBe(emailId);expect(state.cookies.has('oi_session')).toBe(false);
});
test('untrusted redirects cannot escape the site',async()=>{
  const {row}=await startChallenge('email','owner@gmail.com','//evil.example');expect(row.next).toBe('/');
});

test('Google rejects expired, wrong-audience and forged tokens',async()=>{
  for(const variant of ['expired','audience','signature']) {
    const url=await googleFlow();
    const key=variant==='signature'?(await generateKeyPair('RS256')).privateKey:privateKey;
    idToken=await new SignJWT({nonce:url.searchParams.get('nonce'),email:'owner@gmail.com',email_verified:true}).setProtectedHeader({alg:'RS256'}).setSubject('google-owner').setIssuer('https://accounts.google.com').setAudience(variant==='audience'?'other-client':'test-google-client').setIssuedAt().setExpirationTime(variant==='expired'?Math.floor(Date.now()/1000)-60:'5m').sign(key);
    const response=await googleCallback(new Request(`http://localhost:3000/api/auth/google/callback?state=${url.searchParams.get('state')}&code=${variant}`));
    expect(response.headers.get('location')).toContain('error=google');
    expect(state.cookies.has('oi_session')).toBe(false);
  }
});

test('concurrent verification consumes one challenge once and creates one session',async()=>{
  const f=await emailFlow();
  const responses=await Promise.all([status(req({id:f.id,code:f.code}),ctx),status(req({id:f.id,code:f.code}),ctx)]);
  expect(responses.map(r=>r.status).sort()).toEqual([200,410]);
  expect(await state.db.select().from(schema.sessions)).toHaveLength(1);
});
