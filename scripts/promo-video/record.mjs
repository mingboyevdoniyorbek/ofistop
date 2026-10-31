// OfisTop reklama videosi: saytni kompyuter ekranida (1920×1080) kadrma-kadr yozadi va
// Instagram / TikTok / Facebook / YouTube uchun 3 formatda MP4 chiqaradi:
//   ofistop-16x9.mp4  (1920×1080 — YouTube, Facebook lenta, sayt)
//   ofistop-9x16.mp4  (1080×1920 — Instagram Reels/Stories, TikTok)
//   ofistop-4x5.mp4   (1080×1350 — Instagram/Facebook lenta reklamasi)
//
// Ishga tushirish (kompyuterda ffmpeg o'rnatilgan bo'lishi kerak: Windows — `winget install ffmpeg`):
//   npx playwright install chromium        (bir marta)
//   node scripts/promo-video/record.mjs --url https://ofistop.uz --lang uz --out video --listing "Olmazor cityda"
//   node scripts/promo-video/record.mjs --url https://ofistop.uz --lang ru --out video
//   ... --no-captions   (subtitrsiz, ovozni o'zingiz qo'shasiz)
//
// Videoda ovoz yo'q: musiqani Instagram/CapCut'da qo'shing (reklama uchun litsenziyali musiqa).
import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg("url", "http://localhost:3000").replace(/\/+$/, "");
const LANG = arg("lang", "uz") === "ru" ? "ru" : "uz";
const OUT = path.resolve(arg("out", "video"));
const FPS = 30, W = 1920, H = 1080;           // chiqish kadri
const SCALE = 1.25, VW = W / SCALE, VH = H / SCALE; // sahifa 125% masshtabda (noutbukdagidek): matn reklamada o'qiladi
const ru = LANG === "ru";
const P = (p) => (ru ? `/ru${p === "/" ? "" : p}` : p); // sahifa manzili tanlangan tilda
const ffmpeg = process.env.FFMPEG || "ffmpeg";
if (spawnSync(ffmpeg, ["-version"]).status !== 0) { console.error("ffmpeg topilmadi. Windows: winget install ffmpeg"); process.exit(1); }

const T = ru ? {
  intro1: "Нужен офис, магазин или склад?", intro2: "Найдите на OfisTop",
  c1: "Ищите помещение для бизнеса за минуту", c2: "Бизнес-центры и свободные помещения в одном месте",
  c3: "Выберите тип помещения и нажмите «Найти»", c4: "Фото, цена, площадь — всё понятно",
  c5: "Звоните или пишите владельцу в Telegram", c6: "Сравнивайте и сохраняйте", c7: "Бизнес-центры и их свободные помещения", c8: "Объявления на карте",
  types: "Офис, магазин, склад и ещё 5 типов", lang: "Сайт на узбекском и русском",
  outro1: "Разместите объявление бесплатно", cta: "ofistop.uz", points: ["Объявления проверяются модератором", "Контакт владельца — бесплатно"],
} : {
  intro1: "Ofis, do‘kon yoki ombor kerakmi?", intro2: "OfisTop’da toping",
  c1: "Biznesingiz uchun joyni bir daqiqada toping", c2: "Biznes markazlar va bo‘sh xonalar bir joyda",
  c3: "Joy turini tanlang va «Qidirish»ni bosing", c4: "Rasm, narx, maydon — hammasi aniq",
  c5: "Egasiga qo‘ng‘iroq qiling yoki Telegram’da yozing", c6: "Taqqoslang va saqlab qo‘ying", c7: "Biznes markazlar va bo‘sh xonalari", c8: "E’lonlar xaritada",
  types: "Ofis, do‘kon, ombor va yana 5 xil joy", lang: "Sayt o‘zbek va rus tilida",
  outro1: "E’lonni bepul joylang", cta: "ofistop.uz", points: ["E’lonlar moderator tomonidan tekshiriladi", "Egasining kontakti — bepul"],
};

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const logo = `data:image/png;base64,${readFileSync(path.join(root, "src/app/icon.png")).toString("base64")}`;
const work = path.join(OUT, `.frames-${LANG}`);
rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true }); mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: SCALE, locale: ru ? "ru-RU" : "uz-UZ" });
await ctx.addCookies([{ name: "lang", value: LANG, url: BASE }]);
const page = await ctx.newPage();

// ---------- kadr yozish ----------
let frame = 0;
const captions = []; // { from, to, text } soniyada
const now = () => frame / FPS;
const CURSOR = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24"><path d="M4 2l16 9-7 2-3 7z" fill="#0b1f5c" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
let cur = { x: VW * 0.62, y: VH * 0.55 };
async function prepare() {
  await page.evaluate(({ svg, x, y }) => {
    document.querySelector("nextjs-portal")?.remove(); // dev rejimi belgisi
    document.documentElement.style.scrollBehavior = "auto";
    if (!document.getElementById("__cur")) {
      const c = document.createElement("div"); c.id = "__cur"; c.innerHTML = svg;
      c.style.cssText = `position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transform:translate(${x}px,${y}px)`;
      const r = document.createElement("div"); r.id = "__ripple";
      r.style.cssText = "position:fixed;left:0;top:0;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(22,163,74,.35);z-index:2147483646;pointer-events:none;opacity:0";
      document.body.append(r, c);
    }
  }, { svg: CURSOR, ...cur });
}
async function shot(times = 1) {
  const buf = await page.screenshot({ type: "jpeg", quality: 92 });
  for (let i = 0; i < times; i++) writeFileSync(path.join(work, `f${String(frame++).padStart(5, "0")}.jpg`), buf);
}
const hold = (sec) => shot(Math.max(1, Math.round(sec * FPS)));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
async function setCursor(x, y) { cur = { x, y }; await page.evaluate(({ x, y }) => { const c = document.getElementById("__cur"); if (c) c.style.transform = `translate(${x}px,${y}px)`; }, cur); }
async function moveTo(x, y, sec = 0.6) {
  const a = { ...cur }, n = Math.max(1, Math.round(sec * FPS));
  for (let i = 1; i <= n; i++) { const t = ease(i / n); await setCursor(a.x + (x - a.x) * t, a.y + (y - a.y) * t); await shot(); }
}
async function ripple() {
  for (let i = 0; i <= 8; i++) {
    await page.evaluate(({ x, y, i }) => { const r = document.getElementById("__ripple"); if (r) { r.style.left = `${x + 6}px`; r.style.top = `${y + 6}px`; r.style.opacity = String(1 - i / 8); r.style.transform = `scale(${0.4 + i / 8})`; } }, { ...cur, i });
    await shot();
  }
}
async function center(loc) {
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox(); if (!b) throw new Error("Element ko'rinmayapti");
  return { x: b.x + Math.min(b.width / 2, 120), y: b.y + b.height / 2 };
}
async function clickOn(loc, { navigate = false } = {}) {
  const p = await center(loc); await moveTo(p.x, p.y, 0.7); await ripple();
  await Promise.all([navigate ? page.waitForLoadState("networkidle").catch(() => {}) : Promise.resolve(), loc.click()]);
  if (navigate) { await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(400); await prepare(); }
}
async function smoothScroll(toY, sec) {
  const from = await page.evaluate(() => scrollY), n = Math.max(1, Math.round(sec * FPS));
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight); toY = Math.max(0, Math.min(toY, max));
  for (let i = 1; i <= n; i++) { await page.evaluate((y) => scrollTo(0, y), from + (toY - from) * ease(i / n)); await shot(); }
}
async function typeInto(loc, text) {
  await clickOn(loc);
  for (const ch of text) { await page.keyboard.type(ch); await shot(3); }
}
async function go(p) { await page.goto(BASE + P(p), { waitUntil: "networkidle" }); await page.waitForTimeout(500); await prepare(); }
const caption = (text, fn) => async () => { const from = now(); await fn(); captions.push({ from, to: now(), text }); };

// Brend kartasi (kirish/yakun): kadr sayin animatsiya.
async function card(lines, sec, { cta } = {}) {
  await page.setContent(`<html><body style="margin:0;width:${W}px;height:${H}px;zoom:${1 / SCALE};display:grid;place-items:center;font-family:Inter,'Segoe UI',sans-serif;background:linear-gradient(135deg,#12308a,#0b1f5c);color:#fff;overflow:hidden">
    <div id="c" style="text-align:center;opacity:0">
      <div style="display:inline-grid;place-items:center;width:240px;height:240px;border-radius:50%;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.35)"><img src="${logo}" style="width:190px;height:190px"></div>
      <div style="font-size:120px;font-weight:800;margin-top:36px;letter-spacing:-2px">Ofis<span style="color:#4ade80">Top</span></div>
      ${lines.map((l, i) => `<div style="font-size:${i ? 46 : 60}px;font-weight:${i ? 500 : 700};margin-top:${i ? 10 : 26}px;color:${i ? "#bfdbfe" : "#fff"}">${l}</div>`).join("")}
      ${cta ? `<div style="display:inline-block;margin-top:44px;padding:22px 56px;border-radius:999px;background:#16a34a;font-size:52px;font-weight:800">${cta}</div>` : ""}
    </div></body></html>`);
  const n = Math.round(sec * FPS);
  for (let i = 0; i < n; i++) {
    const t = Math.min(1, i / (FPS * 0.6));
    await page.evaluate((t) => { const c = document.getElementById("c"); c.style.opacity = String(t); c.style.transform = `translateY(${(1 - t) * 40}px) scale(${0.94 + 0.06 * t})`; }, ease(t));
    await shot();
  }
}

// ---------- ssenariy (~45 soniya) ----------
// Tartib: bosh sahifa → joy turlari → qidiruv → xarita → e'lon → taqqoslash/saqlash → bog'lanish → biznes markaz → til → e'lon berish.
console.log(`Yozilmoqda: ${BASE} (${LANG})`);
const LISTING = arg("listing", ""); // masalan: --listing "Olmazor cityda"
const optional = async (name, fn) => { try { await fn(); } catch (e) { console.warn(`  [${name}] o'tkazib yuborildi: ${e.message.split("\n")[0]}`); await prepare().catch(() => {}); } };
const homeForm = () => page.locator('form[action="/joylar"]').first();
const hover = async (loc, sec = 0.5) => { const p = await center(loc); await moveTo(p.x, p.y, sec); await loc.hover().catch(() => {}); await shot(4); };

await card([T.intro1, T.intro2], 2.2);

// 1. Bosh sahifa: sarlavha va qidiruv paneli, keyin sekin pastga.
await go("/");
await caption(T.c1, async () => { await hold(1.6); await smoothScroll(VH * 0.55, 3.2); await hold(0.4); })();

// 2. Joy turlari: 8 ta kategoriya ustidan sichqoncha.
await optional("joy turlari", async () => {
  const chips = page.locator('section:has(h2) a[href^="/ijara/"]');
  await chips.first().scrollIntoViewIfNeeded(); await smoothScroll(await page.evaluate(() => scrollY), 0.1);
  await caption(T.types, async () => { const n = Math.min(8, await chips.count()); for (let i = 0; i < n; i++) await hover(chips.nth(i), 0.35); await hold(0.4); })();
});

// 3. Qidiruv: joy turini tanlash va natijalar.
await optional("qidiruv", async () => {
  await smoothScroll(0, 1.0);
  await caption(T.c3, async () => {
    await clickOn(homeForm().getByRole("combobox").first()); await hold(0.6);
    await clickOn(page.getByRole("option", { name: ru ? "Отдельный офис" : "Alohida ofis" })); await hold(0.4);
    await clickOn(homeForm().locator('button:not([role="combobox"])').last(), { navigate: true });
    await hold(1.0); await smoothScroll(VH * 0.6, 1.6); await hold(0.6);
  })();
});

// 4. Xaritadan qidirish.
await optional("xarita", async () => {
  await go("/");
  await caption(T.c8, async () => {
    await clickOn(page.locator('a[href="/joylar?view=map"]').first(), { navigate: true });
    await page.waitForTimeout(3000); await prepare(); await hold(1.0);
    const map = page.locator(".leaflet-container").first();
    if (await map.count()) { const b = await map.boundingBox(); if (b) { await moveTo(b.x + b.width * 0.55, b.y + b.height * 0.45, 0.8); await page.mouse.move(cur.x, cur.y); await page.mouse.wheel(0, -300); await page.waitForTimeout(1200); await prepare(); } }
    await hold(1.6);
  })();
});

// 5. E'lon sahifasi: rasm, narx, belgilar.
await optional("e'lon", async () => {
  await go(LISTING ? `/joylar?q=${encodeURIComponent(LISTING)}` : "/joylar");
  const link = page.locator('article a[href*="/joylar/"]').first();
  await caption(T.c4, async () => {
    await clickOn(link, { navigate: true }); await hold(1.4);
    await hover(page.locator("main h1").first(), 0.6); await hold(0.4);
    await smoothScroll(VH * 0.45, 1.6); await hold(1.0);
  })();
});

// 6. Taqqoslash va saqlash.
await optional("taqqoslash/saqlash", async () => {
  await caption(T.c6, async () => {
    await clickOn(page.locator("main").getByRole("button", { name: ru ? /Сравнить/ : /Taqqoslash/ }).first()); await hold(0.8);
    await clickOn(page.locator("main").getByRole("button", { name: ru ? "Добавить в избранное" : "Sevimlilarga qo'shish" }).first()); await hold(1.2);
  })();
});

// 7. Bog'lanish: tugmalar ko'rsatiladi (bosilmaydi — egasining raqami reklamaga chiqmasin).
await optional("bog'lanish", async () => {
  const btns = page.locator("#aloqa button");
  await caption(T.c5, async () => { const n = Math.min(2, await btns.count()); for (let i = 0; i < n; i++) { await hover(btns.nth(i), 0.6); await hold(0.6); } })();
});

// 8. Biznes markazlar: ro'yxat → markaz → bo'sh xonalar.
await optional("biznes markazlar", async () => {
  await caption(T.c7, async () => {
    await smoothScroll(0, 0.6);
    await clickOn(page.locator('header a[href="/markazlar"]').first(), { navigate: true }); await hold(1.0);
    await clickOn(page.locator('main a[href^="/markazlar/"]').first(), { navigate: true }); await hold(1.0);
    const y = await page.evaluate(() => { const el = document.getElementById("xonalar"); return el ? el.getBoundingClientRect().top + scrollY - 80 : scrollY + 600; });
    await smoothScroll(y, 1.8); await hold(1.2);
  })();
});

// 9. Til almashtirish (UZ ⇄ RU).
await optional("til", async () => {
  await smoothScroll(0, 0.6);
  await caption(T.lang, async () => {
    const other = page.locator(`header button[lang="${ru ? "uz" : "ru"}"]`).first();
    await clickOn(other); await page.waitForTimeout(1500); await prepare(); await hold(1.6);
    const back = page.locator(`header button[lang="${LANG}"]`).first();
    await clickOn(back); await page.waitForTimeout(1500); await prepare(); await hold(0.6);
  })();
});

// 10. E'lon berish tugmasi (bosilmaydi — qoralama yaratmaslik uchun), keyin yakuniy kadr.
await optional("e'lon berish", async () => {
  await caption(T.outro1, async () => { await hover(page.locator("header nav button.bg-accent").first(), 0.8); await ripple(); await hold(1.0); })();
});
await card([T.outro1], 3.4, { cta: T.cta });
await browser.close();
console.log(`${frame} kadr (${(frame / FPS).toFixed(1)} s) yozildi. Montaj...`);

// ---------- yozuvlar (caption) PNG ----------
const capBrowser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const cp = await (await capBrowser.newContext({ deviceScaleFactor: 1 })).newPage();
async function capPng(text, width, size, file) {
  await cp.setViewportSize({ width, height: 400 });
  await cp.setContent(`<html><body style="margin:0;background:transparent;font-family:Inter,'Segoe UI',sans-serif">
    <div id="b" style="display:inline-block;max-width:${width - 80}px;margin:0 40px;padding:${Math.round(size * 0.45)}px ${Math.round(size * 0.9)}px;border-radius:${size}px;background:rgba(11,31,92,.92);color:#fff;font-size:${size}px;font-weight:800;line-height:1.2;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.35)">${text}</div></body></html>`);
  const el = cp.locator("#b"); await el.screenshot({ path: file, omitBackground: true });
}
const frameBg = async (w, h, file) => {
  await cp.setViewportSize({ width: w, height: h });
  await cp.setContent(`<html><body style="margin:0;width:${w}px;height:${h}px;background:linear-gradient(180deg,#12308a,#0b1f5c);font-family:Inter,'Segoe UI',sans-serif;color:#fff;position:relative">
    <div style="position:absolute;top:${Math.round(h * 0.045)}px;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:18px">
      <div style="display:grid;place-items:center;width:110px;height:110px;border-radius:50%;background:#fff"><img src="${logo}" style="width:86px;height:86px"></div>
      <div style="font-size:72px;font-weight:800">Ofis<span style="color:#4ade80">Top</span></div></div>
    ${h > 1500 ? `<div style="position:absolute;top:1340px;left:0;right:0;text-align:center;font-size:44px;font-weight:700;line-height:1.6;color:#dbeafe">${T.points.map((x) => `✓ ${x}`).join("<br>")}</div>` : ""}
    <div style="position:absolute;bottom:${Math.round(h * 0.05)}px;left:0;right:0;text-align:center">
      <div style="display:inline-block;padding:20px 54px;border-radius:999px;background:#16a34a;font-size:54px;font-weight:800">${T.cta}</div></div></body></html>`);
  await cp.screenshot({ path: file });
};
const capFiles = [];
// --no-captions: videoga yozuvlar qo'yilmaydi (ovozni o'zingiz qo'shganda).
const NO_CAPTIONS = process.argv.includes("--no-captions");
for (const [i, c] of (NO_CAPTIONS ? [] : captions).entries()) {
  const wide = path.join(work, `cap16-${i}.png`), tall = path.join(work, `capV-${i}.png`);
  await capPng(c.text, W, 54, wide); await capPng(c.text, 1080, 58, tall);
  capFiles.push({ ...c, wide, tall });
}
await frameBg(1080, 1920, path.join(work, "bg-9x16.png"));
await frameBg(1080, 1350, path.join(work, "bg-4x5.png"));
await capBrowser.close();

// ---------- ffmpeg montaj ----------
function run(args) { const r = spawnSync(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" }); if (r.status !== 0) throw new Error("ffmpeg xatosi"); }
const raw = path.join(work, "raw.mp4");
run(["-framerate", String(FPS), "-i", path.join(work, "f%05d.jpg"), "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", raw]);

const enc = ["-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(FPS), "-movflags", "+faststart"];
function compose(out, { bg, vw, vy, capKey, capY }) {
  const inputs = bg ? ["-loop", "1", "-i", bg, "-i", raw] : ["-i", raw];
  const vIdx = bg ? 1 : 0, capBase = bg ? 2 : 1;
  capFiles.forEach((c) => inputs.push("-i", c[capKey]));
  // Vertikal formatda yon bo'sh joylar kesiladi: sayt kattaroq va o'qiladigan bo'ladi.
  let f = bg ? `[${vIdx}:v]crop=1760:1080:80:0,scale=${vw}:-2:flags=lanczos[v];[0:v][v]overlay=(W-w)/2:${vy}:shortest=1[s0]` : `[0:v]null[s0]`;
  capFiles.forEach((c, i) => {
    const y = capY === "bottom" ? "H-h-70" : String(capY);
    f += `;[s${i}][${capBase + i}:v]overlay=(W-w)/2:${y}:enable='between(t,${c.from.toFixed(2)},${c.to.toFixed(2)})'[s${i + 1}]`;
  });
  run([...inputs, "-filter_complex", f, "-map", `[s${capFiles.length}]`, ...enc, "-t", (frame / FPS).toFixed(2), out]);
}
const name = (r) => path.join(OUT, `ofistop-${LANG}-${r}${NO_CAPTIONS ? "-clean" : ""}.mp4`);
compose(name("16x9"), { capKey: "wide", capY: "bottom" });
compose(name("9x16"), { bg: path.join(work, "bg-9x16.png"), vw: 1080, vy: 600, capKey: "tall", capY: 410 });
compose(name("4x5"), { bg: path.join(work, "bg-4x5.png"), vw: 1080, vy: 360, capKey: "tall", capY: 206 });
if (!process.env.KEEP_FRAMES) rmSync(work, { recursive: true, force: true });
console.log(`Tayyor:\n  ${name("16x9")}\n  ${name("9x16")}\n  ${name("4x5")}`);
if (existsSync(name("16x9"))) process.exit(0);
