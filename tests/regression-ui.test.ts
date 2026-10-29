// @vitest-environment jsdom
import { test, expect, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { safeNext, validDate } from '../src/lib/validation';
import { parseForm } from '../src/lib/listing-input';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('../src/components/PickMap', () => ({ default: () => null }));
import Wizard from '../src/components/ListingWizard';
Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
test('typing multiple characters keeps the same input and focus', async () => {
 const host=document.createElement('div'); document.body.append(host); const root=createRoot(host);
 const initial={category:'office',posterType:'owner',title:'',description:'',priceAmount:'',areaM2:'',currency:'UZS',pricePeriod:'month',priceBasis:'whole',priceNegotiable:false,amenities:[],centerId:null};
 await act(async()=>root.render(React.createElement(Wizard,{updatedAt:new Date().toISOString(),id:'test',slug:'test',initial,images:[],moderation:'draft',rejectionReason:null,archived:false,regions:[],districts:[],amenities:[],centers:[]} as any)));
 expect(host.querySelectorAll('ol li')).toHaveLength(4);
 const input=host.querySelector('input[maxlength="120"]') as HTMLInputElement; input.focus();
 for(const value of ['O','Of','Ofi','Ofis']) {
  const key=Object.keys(input).find(k=>k.startsWith('__reactProps'))!;
  await act(async()=> (input as any)[key].onChange({target:{value}}));
  expect(host.querySelector('input[maxlength="120"]')).toBe(input); expect(document.activeElement).toBe(input);expect(input.value).toBe(value);
 }
 await act(async()=>root.unmount());host.remove();
});
test('autosave keeps inputs enabled and saves edits made during an in-flight request', async () => {
 vi.useFakeTimers();
 const requests: { body: any; resolve: (response: Response) => void }[] = [];
 vi.stubGlobal('fetch', vi.fn((_url, init) => new Promise<Response>(resolve => requests.push({body: JSON.parse(init.body), resolve}))));
 const host=document.createElement('div'); document.body.append(host); const root=createRoot(host);
 try {
  const initial={category:'office',posterType:'owner',title:'',description:'',priceAmount:'',areaM2:'',currency:'UZS',pricePeriod:'month',priceBasis:'whole',priceNegotiable:false,amenities:[],centerId:null};
  await act(async()=>root.render(React.createElement(Wizard,{updatedAt:'v1',id:'test',slug:'test',initial,images:[],moderation:'draft',rejectionReason:null,archived:false,regions:[],districts:[],amenities:[],centers:[]} as any)));
  const input=host.querySelector('input[maxlength="120"]') as HTMLInputElement; input.focus();
  const change=async(value:string)=>{
   const key=Object.keys(input).find(k=>k.startsWith('__reactProps'))!;
   await act(async()=> (input as any)[key].onChange({target:{value}}));
  };
  await change('Ofis');
  input.setSelectionRange(2,2);
  await act(async()=>vi.advanceTimersByTime(2000));
  expect(requests).toHaveLength(1);
  expect(input.matches(':disabled')).toBe(false);
  expect(document.activeElement).toBe(input);
  expect(input.selectionStart).toBe(2);
  await change('Ofis 20');
  await act(async()=>requests[0].resolve(Response.json({updatedAt:'v2'})));
  expect(input.value).toBe('Ofis 20');
  expect(document.activeElement).toBe(input);
  await act(async()=>vi.advanceTimersByTime(2000));
  expect(requests).toHaveLength(2);
  expect(requests[1].body).toMatchObject({fields:{title:'Ofis 20'},expectedUpdatedAt:'v2'});
  // An error on another step must not navigate away or retry indefinitely.
  await act(async()=>requests[1].resolve(Response.json({errors:{areaM2:'Invalid area'}},{status:422})));
  expect(host.querySelector('input[maxlength="120"]')).toBe(input);
  expect(document.activeElement).toBe(input);
  await act(async()=>vi.advanceTimersByTime(10000));
  expect(requests).toHaveLength(2);
  const saveButton=[...host.querySelectorAll('button')].find(b=>b.textContent==='Qoralamani saqlash')!;
  await act(async()=>saveButton.click());
  expect(requests).toHaveLength(3);
  await act(async()=>requests[2].resolve(Response.json({updatedAt:'v3'})));
  await act(async()=>vi.advanceTimersByTime(10000));
  expect(requests).toHaveLength(3);
 } finally {
  await act(async()=>root.unmount()); host.remove(); vi.useRealTimers(); vi.unstubAllGlobals();
 }
});

test('redirects reject protocol-relative, backslash, external and encoded attacks',()=>{
 for(const value of ['//example.com','/\\example.com','https://example.com','/\n/example.com']) expect(safeNext(value,'https://ofisijara.uz')).toBe('/');
 expect(safeNext('/kabinet?holat=draft','https://ofisijara.uz')).toBe('/kabinet?holat=draft');
});
test('real calendar dates and related field validation',()=>{
 expect(validDate('2026-02-31')).toBe(false);expect(validDate('2024-02-29')).toBe(true);expect(validDate('2026-02-29')).toBe(false);
 expect(parseForm({floor:'20',totalFloors:'3'}).errors.floor).toBeTruthy();expect(parseForm({lat:'41',lng:''}).errors.lat).toBeTruthy();
});
