"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {useLocale} from "./I18nProvider";
type Center={id:string;name:string;description:string|null;address:string;regionId:number;districtId:number|null;lat:string|null;lng:string|null;contactPhone:string|null;telegramUsername:string|null;amenities:string[]};
export default function CenterEditor({center,regions,districts,amenities,images}:{center:Center;regions:{id:number;name:string}[];districts:{id:number;regionId:number;name:string}[];amenities:{code:string;name:string}[];images:{id:string;url:string|null}[]}) {
 const ru=useLocale()==="ru", router=useRouter();
 const [f,setF]=useState({...center,description:center.description??"",lat:center.lat??"",lng:center.lng??"",contactPhone:center.contactPhone??"",telegramUsername:center.telegramUsername??""});
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 const inp="block w-full rounded border px-2 py-2";
 async function call(init:RequestInit){setBusy(true);setMsg("");try{const r=await fetch(`/api/admin/centers/${center.id}`,init);const d=await r.json();if(!r.ok)throw new Error(d.error);setMsg(ru?"Сохранено":"Saqlandi");router.refresh();}catch(e){setMsg(e instanceof Error?e.message:"Xato");}finally{setBusy(false);}}
 const patch=(body:object)=>call({method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 return <details className="mt-3 border-t pt-3"><summary className="cursor-pointer text-brand">{ru?"Редактировать центр и фотографии":"Markaz va rasmlarni tahrirlash"}</summary>
 <form onSubmit={e=>{e.preventDefault();patch(f);}} className="mt-3"><fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
 {([['name',ru?'Название':'Nomi'],['address',ru?'Адрес':'Manzil'],['description',ru?'Описание':'Tavsif'],['lat',ru?'Широта':'Kenglik'],['lng',ru?'Долгота':'Uzunlik'],['contactPhone','Telefon'],['telegramUsername','Telegram']] as const).map(([key,label])=><label key={key}>{label}{key==='description'?<textarea className={inp} value={f[key]} onChange={e=>setF({...f,[key]:e.target.value})}/>:<input className={inp} value={f[key]} onChange={e=>setF({...f,[key]:e.target.value})}/>}</label>)}
 <label>{ru?'Регион':'Hudud'}<select className={inp} value={f.regionId} onChange={e=>setF({...f,regionId:Number(e.target.value),districtId:null})}>{regions.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
 <label>{ru?'Район':'Tuman'}<select className={inp} value={f.districtId??''} onChange={e=>setF({...f,districtId:e.target.value?Number(e.target.value):null})}><option value="">—</option>{districts.filter(x=>x.regionId===f.regionId).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
 <div className="flex flex-wrap gap-3 sm:col-span-2">{amenities.map(a=><label key={a.code}><input type="checkbox" checked={f.amenities.includes(a.code)} onChange={e=>setF({...f,amenities:e.target.checked?[...f.amenities,a.code]:f.amenities.filter(x=>x!==a.code)})}/> {a.name}</label>)}</div>
 <button className="rounded bg-brand p-2 text-white">{ru?'Сохранить':'Saqlash'}</button></fieldset></form>
 <div className="mt-3 flex flex-wrap gap-2">{images.map(im=><div key={im.id}>{im.url&&<img src={im.url} alt="" className="h-24 w-32 object-cover"/>}<button disabled={busy} type="button" className="text-red-700 underline" onClick={()=>window.confirm(ru?'Удалить фотографию?':'Rasm o‘chirilsinmi?')&&patch({action:'delete_image',imageId:im.id})}>{ru?'Удалить':'O‘chirish'}</button></div>)}</div>
 <label className="mt-3 block">{ru?'Фотография (до 8 МБ)':'Rasm (8 MB gacha)'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||images.length>=8} onChange={e=>{const file=e.target.files?.[0];if(file){const fd=new FormData();fd.set('file',file);call({method:'POST',body:fd});}e.target.value='';}}/></label>
 {msg&&<p role="status" className="mt-2">{msg}</p>}</details>;
}
