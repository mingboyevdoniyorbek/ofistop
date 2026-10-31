// Asosiy foydalanuvchi jarayoni (texnik topshiriq, 24-bo'lim). Testlar ketma-ket va umumiy holatga tayanadi.
import { test, expect, type Browser, type Page } from "@playwright/test";
import { E2E, RUN, SHOTS, fixtures, loginViaTelegram, noHorizontalScroll, phoneFor, pick, promote, ru, uz } from "./helpers";

test.describe.configure({ mode: "serial" });

const OWNER = { phone: phoneFor(1), uid: 910_000_000 + Number(RUN) };
const OTHER = { phone: phoneFor(2), uid: 920_000_000 + Number(RUN) };
const MOD = { phone: phoneFor(3), uid: 930_000_000 + Number(RUN) };
const TITLE = `E2E ofis ${RUN} Chilonzorda yorug' xona`;
let listingId = "";
let detailUrl = "";
let filterUrl = "";

const newCtx = async (browser: Browser, opts: Parameters<Browser["newContext"]>[0] = {}) => { const c = await browser.newContext({ baseURL: E2E.base, ...opts }); return { c, p: await c.newPage() }; };
// Sessiyalar saqlanadi: bot bir raqamga 10 daqiqada ko'pi bilan 3 ta kod beradi (mahsulotdagi himoya).
const STATE = { owner: `${SHOTS}/../.fixtures/owner-state.json`, other: `${SHOTS}/../.fixtures/other-state.json` };
const as = (browser: Browser, who: keyof typeof STATE, opts: Parameters<Browser["newContext"]>[0] = {}) => newCtx(browser, { storageState: STATE[who], ...opts });
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
const next = (page: Page) => page.getByRole("button", { name: uz["wiz.next"] }).click();

test("18. SMS kirish o'chirilgan: provayder sozlangan bo'lsa ham kod yuborilmaydi, sahifada faqat Telegram/Google", async ({ page }) => {
  const smsBefore = (await (await fetch(`http://127.0.0.1:${E2E.fakePort}/__sms`)).json()).length;
  await page.goto("/kirish?next=/kabinet");
  await expect(page.getByRole("button", { name: uz["login.tg.btn"] })).toBeVisible();
  await shot(page, "01-kirish");
  await expect(page.getByLabel(uz["login.phone.label"])).toHaveCount(0); // SMS forma yo'q
  const r = await page.request.post("/api/auth/request-otp", { data: { phone: phoneFor(4) }, headers: { origin: E2E.base } });
  expect(r.status()).toBe(410);
  expect(JSON.stringify(await r.json())).not.toContain("devCode"); // DEV_OTP_ENABLED=true bo'lsa ham
  expect((await (await fetch(`http://127.0.0.1:${E2E.fakePort}/__sms`)).json()).length).toBe(smsBefore);
});

test("1. Ro'yxatdan o'tish va kirish (Telegram), klaviatura bilan", async ({ page }) => {
  await page.goto("/kirish?next=/kabinet");
  // klaviatura: Tab bilan Telegram tugmasiga yetib borish mumkin
  let reached = false;
  for (let i = 0; i < 25 && !reached; i++) { await page.keyboard.press("Tab"); reached = await page.evaluate((n) => document.activeElement?.textContent === n, uz["login.tg.btn"]); }
  expect(reached).toBe(true);
  await loginViaTelegram(page, OWNER.phone, OWNER.uid);
  await expect(page.getByRole("heading", { name: uz["cab.nav.listings"] })).toBeVisible();
  await page.context().storageState({ path: STATE.owner });
});

test("2–4. Qoralama, validatsiya, xarita, rasm, asosiy rasm, moderatsiyaga yuborish", async ({ browser }) => {
  const img = await fixtures();
  const { p: page } = await as(browser, "owner");
  await page.goto("/kabinet");
  await page.getByRole("button", { name: uz["nav.newListing"] }).first().click();
  await page.waitForURL(/\/kabinet\/elon\/[0-9a-f-]{36}$/);
  listingId = page.url().split("/").pop()!;
  await expect(page.getByRole("heading", { name: uz["wiz.titleNew"] })).toBeVisible();

  // Validatsiya xatosida kiritilgan ma'lumot yo'qolmaydi
  await page.getByLabel(uz["wiz.f.title"]).fill("Ofis");
  await page.getByRole("button", { name: "4. Tekshirish va yuborish" }).click();
  await page.getByRole("button", { name: uz["wiz.submitTitle"] }).click();
  const summary = page.getByRole("alert").filter({ hasText: uz["wiz.mustFill"] });
  await expect(summary).toContainText("Sarlavha kamida 5 belgi bo'lsin");
  await expect(summary).toContainText("Kamida 1 ta rasm yuklang");
  await shot(page, "02-forma-xatolar");
  await summary.getByRole("listitem").filter({ hasText: uz["wiz.f.title"] }).getByRole("button", { name: uz["wiz.fix"] }).click();
  await expect(page.getByLabel(uz["wiz.f.title"])).toHaveValue("Ofis");

  // 1-bosqich
  await pick(page, page.getByLabel(uz["wiz.f.category"]), "Alohida ofis");
  await page.getByLabel(uz["wiz.f.title"]).fill(TITLE);
  await page.getByLabel(uz["wiz.f.description"]).fill("E2E test e'loni: yorug', ta'mirlangan, alohida kirish, metro yaqinida.");
  await next(page);

  // 2-bosqich: hudud, manzil, xaritadan joy tanlash
  await expect(page.getByLabel(uz["f.region"])).toBeVisible();
  await pick(page, page.getByLabel(uz["f.district"]), { index: 1 }); // birinchi haqiqiy tuman
  await page.getByLabel(uz["wiz.f.address"]).fill("Bunyodkor ko'chasi, 1 (E2E)");
  const map = page.getByTestId("pick-map");
  await expect(map.locator(".leaflet-container, .leaflet-pane").first()).toBeAttached();
  await map.click({ position: { x: 120, y: 90 } });
  await expect(page.getByLabel(uz["wiz.lat"])).toHaveValue(/^4\d\.\d{6}$/);
  await expect(page.getByLabel(uz["wiz.lng"])).toHaveValue(/^6\d\.\d{6}$/);
  await expect(map.locator(".leaflet-marker-icon")).toHaveCount(1);
  const latBefore = await page.getByLabel(uz["wiz.lat"]).inputValue();
  await page.getByLabel(uz["wiz.lat"]).fill("41.300000"); // qo'lda kiritish marker'ni suradi
  await expect(page.getByLabel(uz["wiz.lat"])).not.toHaveValue(latBefore);
  await shot(page, "03-forma-xarita");
  await next(page);

  // 3-bosqich: maydon va narx, jami hisob
  await page.getByLabel(uz["f.area"]).fill("100");
  await page.getByLabel(uz["wiz.f.amount"]).fill("10");
  await pick(page, page.getByRole("combobox", { name: uz["f.currency"] }).first(), "USD");
  await pick(page, page.getByLabel(uz["wiz.f.basis"]), uz["wiz.b.per_m2"]);
  await expect(page.getByText(/Jami: 1 000 USD \/ oy/).first()).toBeVisible();
  await page.getByLabel(uz["wiz.f.deposit"]).fill("1000");

  // 3-bosqichda rasmlar ham: biri yaroqsiz — qisman xato
  await page.getByLabel(uz["wiz.pickImg"]).setInputFiles([img.a, img.b, img.bad]);
  await expect(page.getByText("2 ta rasm yuklandi.")).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "not-an-image.jpg" })).toContainText("Fayl rasm emas yoki buzilgan");
  await expect(page.getByRole("img", { name: "Rasm 2" })).toBeVisible();
  await page.getByRole("button", { name: uz["wiz.makePrimary"] }).click();
  await expect(page.getByRole("listitem").filter({ has: page.getByRole("img", { name: "Rasm 2" }) })).toContainText(uz["wiz.primary"]);
  await page.getByLabel("Internet").check().catch(() => undefined);
  await shot(page, "04-forma-rasmlar");
  await next(page);

  // 4-bosqich: aloqa, oldindan ko'rish va yuborish
  await page.getByLabel(uz["wiz.f.phone"]).fill("+998 99 100 20 30");
  await page.getByLabel(uz["prof.telegram"]).fill("@ofis_e2e_test");
  await expect(page.getByRole("heading", { name: uz["wiz.previewTitle"] })).toBeVisible();

  await page.getByRole("button", { name: uz["wiz.submitTitle"] }).click();
  await page.waitForURL(/\/kabinet\?holat=pending/);
  await expect(page.getByRole("listitem").filter({ hasText: TITLE })).toContainText(uz["cab.st.pending"]);
});

test("Tekshiruvdagi e'lon katalogda ko'rinmaydi", async ({ page }) => {
  await page.goto(`/joylar?q=${encodeURIComponent(`E2E ofis ${RUN}`)}`);
  await expect(page.getByText(uz["cat.empty"])).toBeVisible();
});

test("5. Admin tasdiqlagach katalogda paydo bo'ladi; egasiga bildirishnoma", async ({ browser }) => {
  const { c, p } = await newCtx(browser);
  await p.goto("/admin");
  await p.getByLabel("Login", { exact: true }).fill("ofis");
  await p.getByLabel("Parol", { exact: true }).fill("e2e-admin-parol");
  await p.getByRole("button", { name: "Kirish", exact: true }).click();
  await expect(p.getByRole("heading", { name: "Boshqaruv paneli", level: 1 })).toBeVisible(); // kirgach boshqaruv paneli (manzil o'zgarmaydi: /admin)
  await p.goto("/admin/elonlar");
  const row = p.getByRole("listitem").filter({ hasText: TITLE }).first();
  await expect(row).toBeVisible();
  await shot(p, "05-admin-elonlar");
  await row.getByRole("button", { name: uz["adm.approve"] }).click();
  await expect(p.getByRole("listitem").filter({ hasText: TITLE })).toHaveCount(0);
  await c.close();

  const o = await as(browser, "owner");
  await o.p.goto("/kabinet/bildirishnomalar");
  await expect(o.p.getByText("E'loningiz tasdiqlandi")).toBeVisible();
  await o.c.close();
});

test("6–7. Hudud + narx + maydon filtrlari birga ishlaydi; havola boshqa brauzerda bir xil natija beradi", async ({ page, browser }) => {
  await page.goto("/joylar");
  const form = page.locator("form[action='/joylar']:visible").first();
  // Byudjet butun joy uchun: 10 USD/m² × 100 m² = 1 000 USD/oy
  await pick(page, form.getByLabel(uz["f.region"]), "Toshkent shahri");
  await pick(page, form.getByLabel(uz["f.currency"]), "USD");
  await form.getByLabel(uz["f.priceFrom"]).fill("500");
  await form.getByLabel(uz["f.priceTo"]).fill("1500");
  await form.getByLabel(uz["f.areaFrom"]).fill("90");
  await form.getByLabel(uz["f.areaTo"]).fill("110");
  await form.getByRole("button", { name: uz["f.search"] }).click();
  await page.waitForURL(/areaMin=90/);
  filterUrl = page.url();
  expect(filterUrl).toMatch(/region=\d+/); expect(filterUrl).toMatch(/priceMin=500/); expect(filterUrl).toMatch(/priceMode=total/);
  const titles = await page.locator("main article h2, main article h3").allInnerTexts();
  expect(titles.some((x) => x.includes(TITLE))).toBe(true);
  await shot(page, "06-katalog-filtr");

  const other = await newCtx(browser);
  await other.p.goto(filterUrl);
  expect(await other.p.locator("main article h2, main article h3").allInnerTexts()).toEqual(titles);
  await other.c.close();

  // browser back/forward filtr holatini saqlaydi
  await page.goto(filterUrl.replace("areaMax=110", "areaMax=50"));
  await expect(page.getByText(TITLE)).toHaveCount(0);
  await expect(page.getByRole("link", { name: uz["cat.clear"] }).first()).toBeVisible();
  await page.goBack();
  await expect(page.getByText(TITLE).first()).toBeVisible();
});

test("12, 14. Tafsilot: jami narx, depozit alohida, telefon va Telegram tugmalari haqiqiy ma'lumotga bog'langan", async ({ page }) => {
  await page.goto(filterUrl);
  await page.getByRole("link", { name: TITLE }).first().click();
  await page.waitForURL(new RegExp(`/joylar/${listingId}-`));
  detailUrl = page.url();
  await expect(page.getByText(/^1\s000 USD \/ oy$/).first()).toBeVisible(); // butun joy narxi asosiy, m² narxi qo'shimcha
  await expect(page.getByText(/10 USD \/ m² \/ oy/).first()).toBeVisible();
  await expect(page.getByText(/1\u00a0000 USD \(ijara narxiga kirmaydi\)/)).toBeVisible(); // depozit valyutasi narxga ergashgan, alohida ko'rsatiladi
  await page.getByRole("button", { name: uz["ctc.reveal"] }).click();
  await expect(page.getByRole("link", { name: /Qo'ng'iroq: \+998991002030/ })).toHaveAttribute("href", "tel:+998991002030");
  await page.context().route("https://t.me/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "telegram" }));
  const [popup] = await Promise.all([page.waitForEvent("popup"), page.getByRole("button", { name: uz["ctc.tg"] }).click()]);
  await expect(popup).toHaveURL(/t\.me\/ofis_e2e_test/);
  await popup.close();
  await shot(page, "07-elon-tafsilot");
});

test("8. Sevimlilar qayta kirganda saqlanadi", async ({ browser }) => {
  const { c, p } = await newCtx(browser);
  await loginViaTelegram(p, OTHER.phone, OTHER.uid, "/");
  await p.goto(detailUrl);
  await p.getByRole("button", { name: uz["fav.add"] }).first().click();
  await expect(p.getByRole("button", { name: uz["fav.remove"] }).first()).toBeVisible();
  await p.getByRole("button", { name: uz["nav.logout"] }).click();
  await p.waitForURL((u) => u.pathname === "/");
  await loginViaTelegram(p, OTHER.phone, OTHER.uid, "/kabinet/sevimlilar");
  await expect(p.getByRole("link", { name: TITLE })).toBeVisible();
  await c.storageState({ path: STATE.other });
  await c.close();
});

test("9. Begona foydalanuvchi e'lonni tahrirlay olmaydi (sahifa ham, API ham)", async ({ browser }) => {
  const { c, p } = await as(browser, "other");
  const res = await p.goto(`/kabinet/elon/${listingId}`);
  expect(res?.status()).toBe(404);
  const api = await p.request.patch(`/api/listings/${listingId}`, { data: { fields: { title: "Buzildi" } }, headers: { Origin: E2E.base } });
  expect(api.status()).toBe(404);
  const avail = await p.request.post(`/api/listings/${listingId}/availability`, { data: { action: "set", to: "rented" }, headers: { Origin: E2E.base } });
  expect(avail.status()).toBe(404);
  await c.close();
});

test("RU: kabinet, forma va API xatolari rus tilida", async ({ browser }) => {
  const { c, p } = await as(browser, "owner");
  await c.addCookies([{ name: "lang", value: "ru", url: E2E.base }]);
  await p.goto("/kabinet");
  await expect(p.getByRole("heading", { name: ru["cab.nav.listings"] })).toBeVisible();
  await expect(p.getByRole("link", { name: new RegExp(`^${ru["cab.tab.active"]}`) })).toBeVisible();
  await p.goto(`/kabinet/elon/${listingId}`);
  await expect(p.getByRole("button", { name: ru["wiz.next"] })).toBeVisible();
  await expect(p.getByText(ru["wiz.approvedNote"])).toBeVisible();
  const api = await p.request.patch(`/api/listings/${listingId}`, { data: { fields: { areaM2: "-5", floor: "999" } }, headers: { Origin: E2E.base } });
  const body = await api.json();
  expect(api.status()).toBe(422);
  expect(body.error).toBe("В полях есть ошибки");
  expect(body.errors.floor).toBe("Этаж: введите целое число от -3 до 200");
  await p.goto("/kabinet/bildirishnomalar");
  await expect(p.getByText("Ваше объявление одобрено")).toBeVisible();
  await shot(p, "08-kabinet-ru");
  await c.close();
});

test("10. «Ijaraga berildi» — e'lon darhol qidiruvdan chiqadi, eski havola holatni ko'rsatadi", async ({ browser }) => {
  const { c, p } = await as(browser, "owner");
  await p.goto("/kabinet");
  const card = p.getByRole("listitem").filter({ hasText: TITLE });
  await expect(card).toContainText(uz["cab.st.active"]);
  p.once("dialog", (d) => d.accept());
  await card.getByRole("button", { name: uz["cab.a.rented"] }).click();
  await expect(card).toContainText(uz["cab.st.rented"]);
  await c.close();

  const a = await newCtx(browser);
  await a.p.goto(`/joylar?q=${encodeURIComponent(`E2E ofis ${RUN}`)}`);
  await expect(a.p.getByText(uz["cat.empty"])).toBeVisible();
  await a.p.goto(detailUrl);
  await expect(a.p.getByText(/Bu joy hozir mavjud emas/)).toBeVisible();
  await expect(a.p.getByRole("button", { name: uz["ctc.reveal"] })).toHaveCount(0);
  await a.c.close();
});

test("11. Biznes markaz sahifasidagi xonalar shu markazga bog'langan", async ({ page }) => {
  await page.goto("/markazlar?vacant=1"); // filtr: faqat bo'sh xonasi bor markazlar
  await page.locator("main a[href^='/markazlar/']:not([href^='/markazlar/ariza'])").first().click(); // CTA (ariza) havolasi emas
  await page.waitForURL(/\/markazlar\/[0-9a-f]{8}-/);
  const name = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
  const room = page.locator("main a[href^='/joylar/']").first();
  await expect(room).toBeVisible();
  await room.click();
  await page.waitForURL(/\/joylar\//);
  await expect(page.getByRole("link", { name })).toBeVisible();
});

test("Biznes markaz arizasi → admin tasdig'i → vakil kabineti, qo'ng'iroqcha va Telegram xabari", async ({ browser }) => {
  const CENTER = `E2E Markaz ${RUN}`;
  const o = await as(browser, "other");
  await o.p.goto("/markazlar");
  await o.p.getByRole("link", { name: "Ariza qoldirish" }).first().click();
  await o.p.waitForURL("**/markazlar/ariza");
  await o.p.getByLabel(/Biznes markaz nomi/).fill(CENTER);
  await pick(o.p, o.p.getByLabel(/^Hudud/), "Toshkent shahri");
  await o.p.getByLabel(/^Manzil/).fill("Amir Temur ko'chasi 1 (E2E)");
  await o.p.getByLabel(/Mas’ul shaxs/).fill("E2E Vakil");
  await o.p.getByLabel(/^Telefon/).fill(OTHER.phone);
  await o.p.getByRole("button", { name: "Arizani yuborish" }).click();
  await expect(o.p.getByText(/Arizangiz qabul qilindi/)).toBeVisible();
  await shot(o.p, "14-markaz-ariza");

  const { c, p } = await newCtx(browser);
  await p.goto("/admin");
  await p.getByLabel("Login", { exact: true }).fill("ofis");
  await p.getByLabel("Parol", { exact: true }).fill("e2e-admin-parol");
  await p.getByRole("button", { name: "Kirish", exact: true }).click();
  await expect(p.getByRole("heading", { name: "Boshqaruv paneli", level: 1 })).toBeVisible(); // kirgach boshqaruv paneli (manzil o'zgarmaydi: /admin)
  await p.goto("/admin/arizalar");
  const row = p.getByRole("listitem").filter({ hasText: CENTER });
  await expect(row).toBeVisible();
  p.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: /Tasdiqlash va/ }).click();
  await expect(p.getByRole("listitem").filter({ hasText: CENTER })).toHaveCount(0);
  await c.close();

  // Vakil: kabinetda markaz, qo'ng'iroqchada yangi xabar, Telegram'ga ham yuborilgan
  await o.p.goto("/kabinet/markazlar");
  await expect(o.p.getByRole("heading", { name: CENTER })).toBeVisible();
  await expect(o.p.getByText("✓ Tasdiqlangan markaz").first()).toBeVisible();
  const bell = o.p.locator("header button[aria-expanded]");
  await expect(bell).toHaveAttribute("aria-label", /ta yangi/);
  await bell.click();
  await expect(o.p.getByText(`Markazingiz tasdiqlandi: ${CENTER}`).first()).toBeVisible();
  await shot(o.p, "15-qongiroqcha");
  await expect.poll(async () => ((await (await fetch(`http://127.0.0.1:${E2E.fakePort}/__sent`)).json()) as { chat_id: number; text: string }[])
    .some((m) => m.chat_id === OTHER.uid && m.text.includes(`Markazingiz tasdiqlandi: ${CENTER}`))).toBe(true);
  await o.c.close();
});

test("15. Mobil: navigatsiya, filtr paneli, tafsilot va forma gorizontal skrollsiz", async ({ browser }) => {
  const { c, p } = await newCtx(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const url of ["/", "/joylar", "/markazlar", "/kirish"]) { await p.goto(url); await noHorizontalScroll(p); }
  await p.goto("/");
  await shot(p, "09-mobil-bosh");
  await p.goto("/joylar");
  const sum = p.locator("summary").filter({ hasText: new RegExp(`^${uz["cat.filters"]}$`) }); // "Qo‘shimcha filtrlar" emas
  await expect(sum).toBeVisible();
  await sum.click();
  await expect(p.locator("details[open]").getByLabel(uz["f.region"])).toBeVisible();
  await shot(p, "10-mobil-filtr");
  await p.goto(detailUrl.replace(/\/joylar\/.*/, "/joylar"));
  await p.locator("main a[href^='/joylar/']").first().click();
  await noHorizontalScroll(p);
  await p.getByRole("link", { name: uz["det.contactJump"] }).click();
  await expect(p.getByRole("button", { name: uz["ctc.reveal"] }).first()).toBeInViewport();
  await shot(p, "11-mobil-tafsilot");
  await c.addCookies((await (await browser.newContext({ storageState: STATE.owner })).cookies()));
  await p.goto("/joylar");
  await noHorizontalScroll(p);
  // mobil menyu: ochiladi, havola ishlaydi, sahifa almashganda yopiladi
  const menu = p.locator("summary[aria-label='" + uz["nav.menu"] + "']");
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(p.getByRole("link", { name: uz["nav.cabinet"], exact: true })).toBeVisible();
  await shot(p, "13-mobil-menyu");
  await p.getByRole("link", { name: uz["nav.cabinet"], exact: true }).click();
  await p.waitForURL(/\/kabinet$/);
  await expect(p.getByRole("link", { name: uz["nav.cabinet"], exact: true })).toBeHidden();
  await noHorizontalScroll(p);
  await p.locator("main").getByRole("button", { name: uz["nav.newListing"] }).first().click(); // header tugmasi telefonda yashirin (pastki menyuda bor)
  await p.waitForURL(/\/kabinet\/elon\//);
  for (let i = 0; i < 3; i++) { await noHorizontalScroll(p); await next(p); }
  await shot(p, "12-mobil-forma");
  await c.close();
});

test("16. Xarita API xatosi saytni buzmaydi: katalog ro'yxati ishlaydi", async ({ page }) => {
  await page.route("**/api/map**", (r) => r.fulfill({ status: 500, contentType: "application/json", body: '{"error":"x"}' }));
  await page.goto("/joylar?view=map");
  await expect(page.getByRole("link", { name: "Ro‘yxatda ko‘rish" })).toBeVisible();
  await page.getByRole("link", { name: "Ro‘yxatda ko‘rish" }).click();
  await expect(page.locator("main article").first()).toBeVisible();
});
