"""Xarita sahifalari + koordinata oshkor bo'lmasligi tekshiruvi. Ishga tushirish: python3 scripts/map-pages-check.py http://localhost:3000 (server va seed kerak)"""
import re, subprocess, sys, urllib.request, urllib.error
B=sys.argv[1]
def sh(c): return subprocess.run(["psql","-h","localhost","-U","ofisijara","ofisijara","-Atc",c],capture_output=True,text=True,env={"PGPASSWORD":"devpass","PATH":"/usr/bin:/bin"}).stdout.strip().splitlines()
def get(u):
    try: r=urllib.request.urlopen(B+u); return r.status, r.read().decode()
    except urllib.error.HTTPError as e: return e.code, ""
ok=lambda n,c: print(("✓ " if c else "✗ ")+n)
s,h=get("/joylar?view=map"); ok("katalog xarita rejimi 200", s==200)
ok("xarita konteyneri SSR'da bor (window xatosi yo'q)", 'aria-label="Xarita"' in h and "Xarita yuklanmoqda" in h)
ok("almashtirgich: Xarita faol", re.search(r'aria-current="true"[^>]*>Xarita<',h) is not None or 'Xarita</a>' in h)
s,h=get("/joylar?view=map&category=warehouse"); ok("filtr formasi view=map ni saqlaydi", 'name="view"' in h and 'value="map"' in h)
s,h=get("/joylar"); ok("ro'yxat rejimi o'zgarmagan (kartochkalar bor)", s==200 and h.count("aspect-[16/10]")>=12)
tok=lambda v: re.compile(r'(?<![\d.])'+re.escape(v.rstrip("0").rstrip("."))+r'0*(?![\d])')
rows=[r.split("|") for r in sh("select id,slug,lat,lng,exact_location_public,(moderation_status='approved' and availability_status='available' and expires_at>now()) from listings")]
leaks=0; maps=0; approx_n=0
for i,sl,la,ln,ex,pub in rows:
    s,h=get(f"/joylar/{i}-{sl}")
    has='aria-label="Joylashuv xaritasi"' in h
    if pub=="t":
        maps+=has
        if ex=="f":
            approx_n+=1
            if tok(la).search(h) or tok(ln).search(h): leaks+=1; print("   OSHKORALIK:",sl)
    else: ok(f"faol bo'lmagan e'londa xarita yo'q ({sl[:30]})", not has)
ok(f"faol e'lonlarning sahifasida xarita bor ({maps}/12)", maps==12)
ok(f"{approx_n} ta taxminiy e'lon sahifasida haqiqiy koordinata chiqmaydi (HTML + RSC payload)", leaks==0)
s,h=get("/robots.txt"); ok("robots: /api taqiqlangan (xarita API indekslanmaydi)", "Disallow: /api" in h)
