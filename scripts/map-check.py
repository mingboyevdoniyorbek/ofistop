"""Xarita API xavfsizlik tekshiruvi. Dev server (localhost:3000) va seed ma'lumot kerak.
Ishga tushirish: python3 scripts/map-check.py"""
import json, math, re, subprocess, urllib.request
def sh(c): return subprocess.run(["psql","-h","localhost","-U","ofisijara","ofisijara","-Atc",c],capture_output=True,text=True,env={"PGPASSWORD":"devpass","PATH":"/usr/bin:/bin"}).stdout.strip().splitlines()
def get(u): return urllib.request.urlopen("http://localhost:3000"+u).read().decode()
def hav(a,b):
    R=6371000; r=math.radians; dl=r(b[0]-a[0]); dg=r(b[1]-a[1])
    x=math.sin(dl/2)**2+math.cos(r(a[0]))*math.cos(r(b[0]))*math.sin(dg/2)**2; return 2*R*math.asin(math.sqrt(x))
rows={}
for l in sh("select id,lat,lng,exact_location_public,(moderation_status='approved' and availability_status='available' and expires_at>now()) from listings"):
    i,la,ln,ex,pub=l.split("|"); rows[i]=(la,ln,ex=="t",pub=="t")
body=get("/api/map"); d=json.loads(body); ms={m["id"]:m for m in d["markers"]}
ok=lambda n,c: print(("✓ " if c else "✗ ")+n)
pub={i for i,r in rows.items() if r[3]}
ok(f"markerlar = ommaviy e'lonlar ({len(ms)} == {len(pub)})", set(ms)==pub)
ok("band/ijaraga berilgan/muddati o'tgan/to'xtatilgan marker YO'Q", not (set(ms)-pub))
ok("javobda 'exact' yoki xom maydon kaliti yo'q", all(set(m)=={"id","href","title","category","area","price","total","thumb","lat","lng","approx","radiusM"} for m in d["markers"]))
ex_bad=[i for i,m in ms.items() if rows[i][2] and (m["lat"],m["lng"])!=(float(rows[i][0]),float(rows[i][1]))]
ok(f"aniq rejim: haqiqiy koordinata ({sum(1 for i in ms if rows[i][2])} ta)", not ex_bad)
dists=[]; leak=[]
for i,m in ms.items():
    la,ln,exact,_=rows[i]
    if exact: continue
    dists.append(hav((float(la),float(ln)),(m["lat"],m["lng"])))
    for v in (la, ln):  # to'liq raqam TOKEN bo'yicha (prefiks emas: 41.368 siljitilgan 41.36862 ning boshlanishi bo'lishi mumkin)
        if re.search(r'(?<![\d.])'+re.escape(v.rstrip("0").rstrip("."))+r'0*(?![\d])', body): leak.append(i)
ok(f"taxminiy rejim: siljish {min(dists):.0f}–{max(dists):.0f} m ({len(dists)} ta; kutilgan 200–500)", all(197<=x<=503 for x in dists))
ok("taxminiy e'lonlarning haqiqiy koordinata matni javobda uchramaydi", not leak)
ok("taxminiy marker approx=true, radius=500", all(ms[i]["approx"] and ms[i]["radiusM"]==500 for i in ms if not rows[i][2]))
cat=json.loads(get("/api/map?category=warehouse"))["markers"]; ok(f"filtr: category=warehouse -> {len(cat)} marker", len(cat)==1)
mn=json.loads(get("/api/map?q=minor"))["markers"]; ok(f"filtr: q=minor -> {len(mn)} marker (markaz nomi bo'yicha)", len(mn)==2)
am=json.loads(get("/api/map?amenities=internet&amenities=ac"))["markers"]; ok(f"filtr: bir nechta qulaylik -> {len(am)}", 0<len(am)<len(ms))
ok("saralash/page parametrlari xaritani buzmaydi", len(json.loads(get("/api/map?sort=price_asc&page=3"))["markers"])==len(ms))
ok("bo'sh natija xato bermaydi", json.loads(get("/api/map?q=mavjudemas"))["markers"]==[])
# sahifalar: taxminiy e'lonlarning haqiqiy koordinatasi HTML'da chiqmasligi
html=get("/joylar")
bad=[i for i,r in rows.items() if r[3] and not r[2] and any(re.search(r'(?<![\d.])'+re.escape(v.rstrip("0").rstrip("."))+r'0*(?![\d])',html) for v in (r[0],r[1]))]
ok("katalog HTML'ida taxminiy e'lonlarning haqiqiy koordinatasi yo'q", not bad)
