// UI-only browser check against a server with configured test provider names.
// All authentication requests are intercepted: no email or Telegram message is sent.
import { chromium, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const base=process.env.TEST_URL || 'http://localhost:3107';
mkdirSync('test-results',{recursive:true});
try {
 const context=await browser.newContext({baseURL:base,viewport:{width:390,height:844}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let approved=false;let confirms=0;const id='c1a43fe8-2f11-4e00-bab9-f998fead1234';
 await context.route('**/api/auth/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const body=route.request().method()==='POST'?route.request().postDataJSON():{};
  if(path.endsWith('/google/start')) {assert.equal(new URL(route.request().url()).searchParams.get('next'),'/kabinet');return route.fulfill({status:302,headers:{location:'/kirish?google=mock'}});}
  if(path.endsWith('/email/start') || path.endsWith('/telegram/start')) {approved=false;return route.fulfill({json:{ok:true,id,expiresAt:new Date(Date.now()+600000).toISOString(),botUrl:'https://t.me/OfisTopPreviewBot?start=preview'}});}
  if(path.endsWith('/email/confirm')) {confirms++;approved=true;return route.fulfill({json:{ok:true,id}});}
  if(path.endsWith('/status')) return route.fulfill({json: approved || body.code==='123456' ? {ok:true,status:'complete',next:'/kirish?done=1'} : {ok:true,status:'waiting'}});
  throw new Error(`Unexpected auth request ${path}`);
 });
 await page.goto('/kirish');
 for(const name of ['Google orqali kirish','Email orqali kirish','Telegram orqali kirish'])await expect(page.getByRole('button',{name,exact:true})).toBeEnabled();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'test-results/login-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Google orqali kirish',exact:true}).click();await page.waitForURL('**/kirish?google=mock');
 await page.getByRole('button',{name:'Email orqali kirish',exact:true}).click();
 await page.getByLabel('Email',{exact:true}).fill('owner@gmail.com');await page.getByRole('button',{name:'Tasdiqlash xatini yuborish'}).click();
 await expect(page.getByRole('heading',{name:'Pochtangizni tekshiring'})).toBeVisible();
 await page.screenshot({path:'test-results/login-email.png',fullPage:true});
 await page.reload();await expect(page.getByRole('heading',{name:'Pochtangizni tekshiring'})).toBeVisible();
 const confirm=await context.newPage();await confirm.goto(`/kirish/tasdiqlash#token=${'a'.repeat(43)}`);
 await expect(confirm.getByRole('button',{name:'Kirishni tasdiqlash',exact:true})).toBeEnabled();assert.equal(confirms,0);
 await confirm.getByRole('button',{name:'Kirishni tasdiqlash',exact:true}).click();await page.waitForURL('**/kirish?done=1');await confirm.close();
 await page.waitForLoadState('networkidle');await page.goto('/kirish');
 await page.getByRole('button',{name:'Telegram orqali kirish',exact:true}).click();
 await page.getByRole('button',{name:'Telegram orqali kirish',exact:true}).click();
 await expect(page.getByRole('link',{name:'Telegram botni ochish'})).toHaveAttribute('href',/^https:\/\/t\.me\//);
 await page.getByRole('button',{name:'Orqaga',exact:true}).click();
 await page.getByRole('button',{name:'Telegram orqali kirish',exact:true}).click();await page.getByRole('button',{name:'yoki kod bilan'}).click();
 await page.getByLabel('Telefon raqami').fill('+998901112233');await page.getByRole('button',{name:'Kodni yuborish',exact:true}).click();
 await page.screenshot({path:'test-results/login-telegram.png',fullPage:true});
 await page.getByLabel('Tasdiqlash kodi').fill('123456');await page.getByRole('button',{name:'Tasdiqlash va kirish'}).click();await page.waitForURL('**/kirish?done=1');
 await context.addCookies([{name:'lang',value:'ru',url:base}]);await page.goto('/kirish');
 await expect(page.getByRole('button',{name:'Войти через Google',exact:true})).toBeVisible();
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/login-desktop-ru.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS: mobile/desktop UZ/RU, Google selection, email resume and confirmation, Telegram link/code, no page errors. Provider requests were mocked.');
} finally {await browser.close();}
