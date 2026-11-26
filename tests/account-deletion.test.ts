import { beforeAll, afterAll, test, expect, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

const state = vi.hoisted(() => ({ db: null as any, client: null as any }));
vi.mock("../src/db/client", async () => ({ db: () => state.db, queryClient: () => state.client, schema: await import("../src/db/schema") }));

import { deleteAccount } from "../src/lib/account";

let owner: any, other: any, staff: any, listingId: string, otherListingId: string, staffListingId: string;

beforeAll(async () => {
  state.client = new PGlite();
  state.db = drizzle(state.client, { schema });
  for (const file of readdirSync("drizzle").filter((f) => f.endsWith(".sql")).sort()) await state.client.exec(readFileSync(`drizzle/${file}`, "utf8"));
  const [region] = await state.db.insert(schema.regions).values({ slug: "toshkent-shahri", nameUz: "Toshkent", nameRu: "Ташкент" }).returning();
  [owner] = await state.db.insert(schema.users).values({ phone: "+998901110001" }).returning();
  [other] = await state.db.insert(schema.users).values({ phone: "+998901110002" }).returning();
  [staff] = await state.db.insert(schema.users).values({ phone: "+998901110003", role: "admin" }).returning();
  await state.db.insert(schema.profiles).values([
    { userId: owner.id, displayName: "Ism Familiya", contactPhone: "+998901110001" },
    { userId: other.id, displayName: "Boshqa" },
  ]);
  const base = { posterType: "owner" as const, category: "office" as const, regionId: region.id, title: "Ofis", address: "Toshkent" };
  [{ id: listingId }] = await state.db.insert(schema.listings).values({ ...base, slug: "ofis-1", ownerId: owner.id }).returning({ id: schema.listings.id });
  [{ id: otherListingId }] = await state.db.insert(schema.listings).values({ ...base, slug: "ofis-2", ownerId: other.id }).returning({ id: schema.listings.id });
  [{ id: staffListingId }] = await state.db.insert(schema.listings).values({ ...base, slug: "ofis-3", ownerId: staff.id }).returning({ id: schema.listings.id });
  await state.db.insert(schema.listingImages).values({ listingId, storageKey: "img/00000000-0000-0000-0000-000000000001.webp" });
  await state.db.insert(schema.favorites).values({ userId: owner.id, listingId: otherListingId });
  await state.db.insert(schema.savedSearches).values({ userId: owner.id, name: "Ofislar", query: "currency=USD" });
  await state.db.insert(schema.notifications).values({ userId: owner.id, title: "Salom", body: "", href: "/" });
  await state.db.insert(schema.reports).values({ listingId: otherListingId, reporterId: owner.id, reason: "fraud_suspected", comment: "izoh" });
  // Boshqa odamning shikoyatini o'chirilayotgan foydalanuvchi ko'rib chiqqan (resolvedBy) — yozuv qolishi kerak.
  await state.db.insert(schema.reports).values({ listingId: staffListingId, reporterId: other.id, reason: "wrong_price", status: "resolved", resolvedBy: owner.id });
  await state.db.insert(schema.serviceRequests).values({ userId: owner.id, name: "Ism", phone: "+998901110001" });
  await state.db.insert(schema.moderationEvents).values({ listingId: otherListingId, actorId: owner.id, toStatus: "pending" });
  await state.db.insert(schema.auditLogs).values({ actorId: owner.id, action: "listing.create", entityType: "listing", entityId: listingId });
  await state.db.insert(schema.telegramLinks).values({ telegramUserId: 555, chatId: 555, phone: owner.phone });
  await state.db.insert(schema.authIdentities).values({ provider: "google", subject: "google-sub-1", userId: owner.id });
}, 30000);

afterAll(async () => { await state.client.close(); });

test("xizmat hisobi bu yo'l bilan o'chmaydi", async () => {
  await expect(deleteAccount(staff.id)).rejects.toThrow(/Xizmat hisobini/);
  expect((await state.db.select().from(schema.users).where(eq(schema.users.id, staff.id))).length).toBe(1);
});

test("hisob, e'lonlar va shaxsiy yozuvlar o'chadi; begona ma'lumot qoladi", async () => {
  const { listings } = await deleteAccount(owner.id);
  expect(listings).toBe(1);

  const sel = (table: any, col: any, v: string) => state.db.select().from(table).where(eq(col, v));
  expect(await sel(schema.users, schema.users.id, owner.id)).toEqual([]);
  expect(await sel(schema.profiles, schema.profiles.userId, owner.id)).toEqual([]);
  expect(await sel(schema.listings, schema.listings.id, listingId)).toEqual([]);
  expect(await sel(schema.listingImages, schema.listingImages.listingId, listingId)).toEqual([]);
  expect(await sel(schema.favorites, schema.favorites.userId, owner.id)).toEqual([]);
  expect(await sel(schema.savedSearches, schema.savedSearches.userId, owner.id)).toEqual([]);
  expect(await sel(schema.notifications, schema.notifications.userId, owner.id)).toEqual([]);
  expect(await sel(schema.reports, schema.reports.reporterId, owner.id)).toEqual([]);
  expect(await sel(schema.serviceRequests, schema.serviceRequests.userId, owner.id)).toEqual([]);
  expect(await sel(schema.telegramLinks, schema.telegramLinks.phone, owner.phone)).toEqual([]);
  expect(await sel(schema.authIdentities, schema.authIdentities.userId, owner.id)).toEqual([]);

  // Tarix qoladi, lekin shaxsga bog'lanmagan holda.
  const events = await sel(schema.moderationEvents, schema.moderationEvents.listingId, otherListingId);
  expect(events.length).toBe(1); expect(events[0].actorId).toBe(null);
  const audit = await state.db.select().from(schema.auditLogs);
  expect(audit.filter((a: any) => a.actorId !== null)).toEqual([]);
  expect(audit.some((a: any) => a.action === "user.self_deleted" && a.entityId === owner.id)).toBe(true);

  // Boshqa foydalanuvchining e'loni va uning shikoyati tegilmaydi (faqat resolvedBy bo'shaydi).
  expect((await sel(schema.listings, schema.listings.id, otherListingId)).length).toBe(1);
  const left = await sel(schema.reports, schema.reports.reporterId, other.id);
  expect(left.length).toBe(1); expect(left[0].resolvedBy).toBe(null);

  // O'sha telefon bilan qaytib ro'yxatdan o'tish mumkin.
  const [again] = await state.db.insert(schema.users).values({ phone: owner.phone }).returning();
  expect(again.id).not.toBe(owner.id);
});
