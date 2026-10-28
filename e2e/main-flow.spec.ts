// Asosiy foydalanuvchi jarayoni (texnik topshiriq, 24-bo'lim). Testlar ketma-ket va umumiy holatga tayanadi.
import { test, expect, type Browser, type Page } from "@playwright/test";
import { E2E, RUN, SHOTS, fixtures, loginViaTelegram, noHorizontalScroll, phoneFor, promote, ru, uz } from "./helpers";

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

test("18 + SMS kirish: production'da test OTP yo'q, kod haqiqiy SMS provayderi (soxta Eskiz) orqali keladi", async ({ page }) => {
  const SMS = phoneFor(4);
  const smsBefore = (await (await fetch(`http://127.0.0.1:${E2E.fakePort}/__sms`)).json()).length;
  await page.goto("/kirish?next=/kabinet");
  await expect(page.getByRole("button", { name: uz["login.tg.btn"] })).toBeVisible();
  await shot(page, "01-kirish");
  await page.getByLabel(uz["login.phone.label"]).fill(SMS.replace(/(\+998)(\d\d)(\d{3})(\d\d)(\d\d)/, "$1 $2 $3 $4 $5"));
  const [resp] = await Promise.all([page.waitForResponse("**/api/auth/request-otp"), page.getByRole("button", { name: uz["login.phone.get"] }).click()]);
  expect(resp.status()).toBe(200);
  expect(JSON.stringify(await resp.json())).not.toContain("devCode"); // DEV_OTP_ENABLED=true bo'lsa ham
  await expect(page.getByText(/TEST REJIMI/i)).toHaveCount(0);
  const sms = (await (await fetch(`http://127.0.0.1:${E2E.fakePort}/__sms`)).json()).slice(smsBefore) as Record<string, string>[];
  expect(sms).toHaveLength(1);
  expect(sms[0].mobile_phone).toBe(SMS.slice(1));
  expect(sms[0].from).toBe("4546");
  const code = /(\d{6})/.exec(sms[0].message)![1];
  // noto'g'ri kod -> xato, kirmaydi
  await page.getByLabel(uz["login.code.label"]).fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: uz["login.submit"], exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Kod noto'g'ri" })).toBeVisible();
  await page.getByLabel(uz["login.code.label"]).fill(code);
  await page.getByRole("button", { name: uz["login.submit"], exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/kabinet");
  await expect(page.getByRole("heading", { name: uz["cab.nav.listings"] })).toBeVisible();
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
  await page.getByRole("button", { name: `6. ${uz["wiz.s6"]}` }).click();
  await page.getByRole("button", { name: uz["wiz.submitTitle"] }).click();
  const summary = page.getByRole("alert").filter({ hasText: uz["wiz.mustFill"] });
  await expect(summary).toContainText("Sarlavha kamida 5 belgi bo'lsin");
  await expect(summary).toContainText("Kamida 1 ta rasm yuklang");
  await shot(page, "02-forma-xatolar");
  await summary.getByRole("listitem").filter({ hasText: uz["wiz.f.title"] }).getByRole("button", { name: uz["wiz.fix"] }).click();
  await expect(page.getByLabel(uz["wiz.f.title"])).toHaveValue("Ofis");

  // 1-bosqich
  await page.getByLabel(uz["wiz.f.category"]).selectOption("office");
  await page.getByLabel(uz["wiz.f.title"]).fill(TITLE);
  await page.getByLabel(uz["wiz.f.description"]).fill("E2E test e'loni: yorug', ta'mirlangan, alohida kirish, metro yaqinida.");
  await next(page);

  // 2-bosqich: hudud, manzil, xaritadan joy tanlash
  await expect(page.getByLabel(uz["f.region"])).toBeVisible();
  const district = page.getByLabel(uz["f.district"]);
  const opts = await district.locator("option").evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value).filter(Boolean));
  if (opts.length) await district.selectOption(opts[0]);
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
  await page.getByRole("combobox", { name: uz["f.currency"] }).first().selectOption("USD");
  await page.getByLabel(uz["wiz.f.basis"]).selectOption("per_m2");
  await expect(page.getByText(/Jami: 1 000 USD \/ oy/).first()).toBeVisible();
  await page.getByLabel(uz["wiz.f.deposit"]).fill("1000");
  await next(page);

  // 4-bosqich: rasm (biri yaroqsiz — qisman xato), asosiy rasmni tanlash
  await page.getByLabel(uz["wiz.pickImg"]).setInputFiles([img.a, img.b, img.bad]);
  await expect(page.getByText("2 ta rasm yuklandi.")).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "not-an-image.jpg" })).toContainText("Fayl rasm emas yoki buzilgan");
  await expect(page.getByRole("img", { name: "Rasm 2" })).toBeVisible();
  await page.getByRole("button", { name: uz["wiz.makePrimary"] }).click();
  await expect(page.getByRole("listitem").filter({ has: page.getByRole("img", { name: "Rasm 2" }) })).toContainText(uz["wiz.primary"]);
  await page.getByLabel("Internet").check().catch(() => undefined);
  await shot(page, "04-forma-rasmlar");
  await next(page);

  // 5-bosqich: aloqa va oldindan ko'rish
  await page.getByLabel(uz["wiz.f.phone"]).fill("+998 99 100 20 30");
  await page.getByLabel(uz["prof.telegram"]).fill("@ofis_e2e_test");
  await expect(page.getByRole("heading", { name: uz["wiz.previewTitle"] })).toBeVisible();
  await next(page);

  // 6-bosqich: yuborish
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
  await p.getByLabel("Parol", { exact: true }).fill("ijara");
  await p.getByRole("button", { name: "Kirish", exact: true }).click();
  await p.waitForURL("**/admin/elonlar?holat=pending");
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
  await form.getByLabel(uz["f.region"]).selectOption({ index: 1 });
  await form.getByLabel(uz["f.currency"]).selectOption("USD");
  await form.getByLabel(uz["f.unit"]).selectOption("per_m2");
  await form.getByLabel(uz["f.priceFrom"]).fill("5");
  await form.getByLabel(uz["f.priceTo"]).fill("15");
  await form.getByLabel(uz["f.areaFrom"]).fill("90");
  await form.getByLabel(uz["f.areaTo"]).fill("110");
  await form.getByRole("button", { name: uz["f.search"] }).click();
  await page.waitForURL(/areaMin=90/);
  filterUrl = page.url();
  expect(filterUrl).toMatch(/region=\d+/); expect(filterUrl).toMatch(/priceMin=5/); expect(filterUrl).toMatch(/basis=per_m2/);
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
  await expect(page.getByText(/Jami: 1 000 USD \/ oy/).first()).toBeVisible();
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
  await page.goto("/markazlar");
  await page.locator("main a[href^='/markazlar/']").first().click();
  const name = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
  const room = page.locator("main a[href^='/joylar/']").first();
  await expect(room).toBeVisible();
  await room.click();
  await page.waitForURL(/\/joylar\//);
  await expect(page.getByRole("link", { name })).toBeVisible();
});

test("15. Mobil: navigatsiya, filtr paneli, tafsilot va forma gorizontal skrollsiz", async ({ browser }) => {
  const { c, p } = await newCtx(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const url of ["/", "/joylar", "/markazlar", "/kirish"]) { await p.goto(url); await noHorizontalScroll(p); }
  await p.goto("/");
  await shot(p, "09-mobil-bosh");
  await p.goto("/joylar");
  const sum = p.locator("summary", { hasText: uz["cat.filters"] });
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
  await p.getByRole("button", { name: uz["nav.newListing"] }).first().click();
  await p.waitForURL(/\/kabinet\/elon\//);
  for (let i = 0; i < 5; i++) { await noHorizontalScroll(p); await next(p); }
  await shot(p, "12-mobil-forma");
  await c.close();
});

test("16. Xarita API xatosi saytni buzmaydi: katalog ro'yxati ishlaydi", async ({ page }) => {
  await page.route("**/api/map**", (r) => r.fulfill({ status: 500, contentType: "application/json", body: '{"error":"x"}' }));
  await page.goto("/joylar?view=map");
  await expect(page.getByRole("link", { name: uz["map.backList"] })).toBeVisible();
  await page.getByRole("link", { name: uz["map.backList"] }).click();
  await expect(page.locator("main article").first()).toBeVisible();
});
