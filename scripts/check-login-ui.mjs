// Browser checks with mocked providers: no real email or Telegram messages.
import { chromium, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const base=process.env.TEST_URL || 'http://localhost:3107';
mkdirSync('test-results',{recursive:true});
try {
 const context=await browser.newContext({baseURL:base,viewport:{width:390,height:844}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let googleFails=true, approved=false;const id='c1a43fe8-2f11-4e00-bab9-f998fead1234';
 await context.route('https://accounts.google.com/**',route=>route.fulfill({status:302,headers:{location:base+'/kirish?google=mock'}}));
 await context.route('https://t.me/**',route=>route.fulfill({status:302,headers:{location:base+'/kirish?telegram=mock'}}));
 await context.route('**/api/auth/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const body=route.request().method()==='POST'?route.request().postDataJSON():{};
  if(path.endsWith('/google/start')) {
   assert.equal(route.request().headers().accept,'application/json');
   assert.equal(new URL(route.request().url()).searchParams.get('next'),'/kabinet');
   if(googleFails)return route.fulfill({status:503,json:{error:'Login temporarily unavailable',code:'AUTH_DATABASE_URL_MISSING'}});
   return route.fulfill({json:{url:'https://accounts.google.com/o/oauth2/v2/auth?mock=1'}});
  }
  if(path.endsWith('/telegram/start')) {approved=false;return route.fulfill({json:{ok:true,id,expiresAt:new Date(Date.now()+600000).toISOString(),botUrl:'https://t.me/OfisTopPreviewBot?start=preview'}});}
  if(path.endsWith('/status')) return route.fulfill({json: approved || body.code==='123456' ? {ok:true,status:'complete',next:'/kirish?done=1'} : {ok:true,status:'waiting'}});
  throw new Error('Unexpected auth request '+path);
 });
 await page.goto('/kirish');
 for(const name of ['Google orqali kirish','Telegram orqali kirish'])await expect(page.getByRole('button',{name,exact:true})).toBeEnabled();
 await expect(page.getByRole('button',{name:/Email/i})).toHaveCount(0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.getByRole('button',{name:'Google orqali kirish',exact:true}).click();
 await expect(page.locator('p[role="alert"]')).toHaveText('Login temporarily unavailable');assert.equal(new URL(page.url()).pathname,'/kirish');
 await page.screenshot({path:'test-results/login-google-error.png',fullPage:true});
 googleFails=false;
 await page.getByRole('button',{name:'Google orqali kirish',exact:true}).click();await page.waitForURL('**/kirish?google=mock');
 await page.screenshot({path:'test-results/login-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Telegram orqali kirish',exact:true}).click();
 await page.getByRole('button',{name:'Telegram orqali kirish',exact:true}).click();
 await page.waitForURL('**/kirish?telegram=mock');
 await expect(page.getByRole('link',{name:'Telegram botni ochish'})).toHaveAttribute('href',/^https:\/\/t\.me\//);
 await page.reload();await expect(page.getByRole('link',{name:'Telegram botni ochish'})).toBeVisible();
 approved=true;await page.waitForURL('**/kirish?done=1');
 await page.getByRole('button',{name:'Telegram orqali kirish',exact:true}).click();await page.getByRole('button',{name:'yoki kod bilan'}).click();
 await page.getByLabel('Telefon raqami').fill('+998901112233');await page.getByRole('button',{name:'Kodni yuborish',exact:true}).click();
 await page.screenshot({path:'test-results/login-telegram.png',fullPage:true});
 await page.getByLabel('Tasdiqlash kodi').fill('123456');await page.getByRole('button',{name:'Tasdiqlash va kirish'}).click();await page.waitForURL('**/kirish?done=1');
 await context.addCookies([{name:'lang',value:'ru',url:base}]);await page.goto('/kirish');
 await expect(page.getByRole('button',{name:/Google/})).toBeVisible();
 await expect(page.getByRole('button',{name:/email/i})).toHaveCount(0);
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/login-desktop-ru.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS: UZ/RU mobile/desktop, email removed, Google inline error/retry, Telegram auto-open/resume/confirmation/code. Providers mocked.');
} finally {await browser.close();}
