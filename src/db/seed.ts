import "../../scripts/load-env";
// FAQAT development uchun demo ma'lumotlar. Production'da ishlamaydi.
import { db, closeDb, schema as s } from "./client";
import { pathToFileURL } from "node:url";
import { slugify } from "../lib/text";
import { eq } from "drizzle-orm";

if (process.env.NODE_ENV === "production") {
  console.error("Seed production'da ishga tushmaydi."); process.exit(1);
}

import { regions, tashDistricts, amenities } from "./reference-data";

type Cat = typeof s.categoryEnum.enumValues[number];
type Avail = typeof s.availabilityEnum.enumValues[number];
// [sarlavha, kategoriya, tuman idx, m2, narx(major), valyuta, basis, qavat, mavjudlik, markaz idx|null, egasi idx, amenities]
const L: [string, Cat, number, number, number, "UZS" | "USD", "whole" | "per_m2" | "per_seat", number | null, Avail, number | null, number, string[]][] = [
  ["Yorug' ofis, metro yaqinida", "office", 0, 45, 9, "USD", "per_m2", 2, "available", null, 0, ["internet", "ac", "heating"]],
  ["Biznes markazda 20 m² xona", "bc_room", 1, 20, 400, "USD", "whole", 5, "available", 0, 1, ["internet", "ac", "elevator", "security"]],
  ["Biznes markazda 35 m² xona", "bc_room", 1, 35, 650, "USD", "whole", 5, "available", 0, 1, ["internet", "ac", "elevator", "security", "parking"]],
  ["Biznes markazda 60 m² blok", "bc_room", 1, 60, 10, "USD", "per_m2", 7, "reserved", 0, 1, ["internet", "ac", "elevator", "security", "access247"]],
  ["Kovorking: ochiq ish o'rni", "coworking", 3, 4, 1800000, "UZS", "per_seat", 3, "available", 1, 2, ["internet", "kitchen", "access247", "furniture"]],
  ["Kovorking: yopiq jamoa xonasi", "coworking", 3, 25, 6500000, "UZS", "whole", 3, "available", 1, 2, ["internet", "kitchen", "access247", "ac"]],
  ["Markaziy ko'chada do'kon", "retail", 4, 70, 18000000, "UZS", "whole", 1, "available", null, 3, ["separate_entrance", "water", "wc", "ac"]],
  ["Savdo joyi, gavjum ko'cha", "retail", 0, 30, 9500000, "UZS", "whole", 1, "rented", null, 3, ["separate_entrance", "wc"]],
  ["Xizmat ko'rsatish xonasi (go'zallik/shifokor)", "service_room", 2, 18, 4200000, "UZS", "whole", 2, "available", 2, 0, ["water", "wc", "ac", "furniture"]],
  ["Ombor 300 m², yuk mashinasi kiradi", "warehouse", 5, 300, 4, "USD", "per_m2", 1, "available", null, 4, ["truck_access", "three_phase", "security"]],
  ["Quruq ombor, qo'riqlanadigan hudud", "warehouse", 5, 150, 22000000, "UZS", "whole", 1, "paused", null, 4, ["truck_access", "security"]],
  ["Kichik ishlab chiqarish sexi", "production", 5, 220, 6, "USD", "per_m2", 1, "available", null, 4, ["three_phase", "truck_access", "water", "heating"]],
  ["Boshlovchi uchun 15 m² ofis", "office", 0, 15, 2800000, "UZS", "whole", 4, "available", null, 0, ["internet", "heating"]],
  ["Yakkasaroyda 90 m² premium ofis", "office", 4, 90, 14, "USD", "per_m2", 6, "available", 2, 1, ["internet", "ac", "elevator", "parking", "security", "kitchen"]],
  ["Eski e'lon: muddati tugagan ofis", "office", 1, 50, 800, "USD", "whole", 3, "expired", null, 0, ["internet"]],
  ["Boshqa tijorat joyi: ko'rgazma zali", "other", 3, 120, 11000000, "UZS", "whole", 1, "available", null, 3, ["separate_entrance", "ac", "wc", "parking"]],
];

export async function seedDemo() {
  const d = db();
  await d.insert(s.regions).values(regions.map(([slug, nameUz, nameRu]) => ({ slug, nameUz, nameRu }))).onConflictDoNothing();
  const rs = await d.select().from(s.regions);
  const tash = rs.find((r) => r.slug === "toshkent-shahri")!;
  await d.insert(s.districts).values(tashDistricts.map(([slug, nameUz, nameRu]) => ({ regionId: tash.id, slug, nameUz, nameRu }))).onConflictDoNothing();
  const allDistricts = await d.select().from(s.districts);
  const ds = tashDistricts.map(([slug]) => allDistricts.find(x => x.slug === slug && x.regionId === tash.id)!);
  await d.insert(s.amenities).values(amenities.map(([code, nameUz, nameRu]) => ({ code, nameUz, nameRu }))).onConflictDoNothing();
  await d.insert(s.settings).values({ key: "listing_ttl_days", value: "30" }).onConflictDoNothing();

  // Demo foydalanuvchilar: bo'sh/soxta operator kodli raqamlar. Haqiqiy odamlarniki emas.
  const people = [
    ["+998000000001", "Demo Mulk Egasi A", "owner"], ["+998000000002", "Demo Biznes Markaz Vakili", "business_center"],
    ["+998000000003", "Demo Kovorking Boshqaruvchi", "business_center"], ["+998000000004", "Demo Agentlik", "agency"], ["+998000000005", "Demo Mulk Egasi B", "owner"],
  ] as const;
  const users = [];
  for (const [phone, displayName, posterType] of people) {
    const [u] = await d.insert(s.users).values({ phone, isDemo: true, phoneVerifiedAt: new Date() }).onConflictDoUpdate({ target: s.users.phone, set: { isDemo: true } }).returning();
    await d.insert(s.profiles).values({ userId: u.id, displayName, posterType, contactPhone: phone }).onConflictDoNothing();
    users.push(u);
  }

  const centers = [
    ["Demo Minor Business Center", "Yunusobod", 1, "Yunusobod tumani, Demo ko'chasi 1 (DEMO)", "41.3650", "69.2850"],
    ["Demo Kovorking Hub", "Shayxontohur", 3, "Shayxontohur tumani, Demo ko'chasi 2 (DEMO)", "41.3250", "69.2400"],
    ["Demo Premium Plaza", "Yakkasaroy", 4, "Yakkasaroy tumani, Demo ko'chasi 3 (DEMO)", "41.2900", "69.2600"],
  ] as const;
  const cs = [];
  for (const [i, [name, , di, address, lat, lng]] of centers.entries()) {
    const [c] = await d.insert(s.businessCenters).values({
      slug: slugify(name), name, address, lat, lng, regionId: tash.id, districtId: ds[di].id, isDemo: true,
      description: "Demo ma'lumot. Haqiqiy obyekt emas.", amenities: ["internet", "security"], contactPhone: people[i + 1][0],
    }).onConflictDoNothing().returning();
    if (c) { cs.push(c); await d.insert(s.businessCenterMemberships).values({ centerId: c.id, userId: users[i + 1].id }).onConflictDoNothing(); }
    else cs.push((await d.select().from(s.businessCenters).where((await import("drizzle-orm")).eq(s.businessCenters.slug, slugify(name))))[0]);
  }

  const now = Date.now();
  for (const [i, [title, category, di, area, price, currency, basis, floor, avail, ci, oi, am]] of L.entries()) {
    const expired = avail === "expired";
    const [l] = await d.insert(s.listings).values({
      slug: `${slugify(title)}-${i + 1}`, ownerId: users[oi].id, centerId: ci === null ? null : cs[ci].id,
      posterType: oi === 3 ? "agency" : oi === 0 || oi === 4 ? "owner" : "business_center", category, title: `[DEMO] ${title}`,
      description: "Demo e'lon: ma'lumotlar to'qilgan, haqiqiy obyekt emas.", regionId: tash.id, districtId: ds[di].id,
      address: "Demo manzil", areaM2: String(area), floor, furnished: am.includes("furniture"),
      priceAmountMinor: BigInt(price) * 100n, currency, pricePeriod: "month", priceBasis: basis,
      seats: category === "coworking" && basis === "per_seat" ? 1 : null,
      commissionType: oi === 3 ? "percent" : "none", commissionPercent: oi === 3 ? "50" : null, commissionPercentBase: oi === 3 ? "monthly_rent" : null,
      depositAmountMinor: basis === "whole" ? BigInt(price) * 100n : null, depositCurrency: basis === "whole" ? currency : null,
      utilities: "separate", minTermMonths: 6, amenities: am, contactPhone: people[oi][0],
      moderationStatus: "approved", availabilityStatus: avail, isDemo: true,
      publishedAt: new Date(now - (i + 1) * 864e5), availabilityConfirmedAt: new Date(now - i * 432e5),
      expiresAt: new Date(now + (expired ? -2 : 25) * 864e5),
      unitCode: ci === null ? null : `D-${i + 1}`,
    }).onConflictDoNothing().returning();
    if (!l) continue;
    await d.insert(s.listingAmenities).values(am.map((a) => ({ listingId: l.id, amenityCode: a }))).onConflictDoNothing();
    await d.insert(s.listingImages).values({ listingId: l.id, storageKey: `placeholder:${category}`, isPrimary: true, isPlaceholder: true });
  }
  // Demo koordinatalar: tuman markazi atrofida; markazdagi xonalar markaz koordinatasida. Har 3-chisi aniq, qolganlari taxminiy.
  const DIST_XY = [[41.2750, 69.2040], [41.3650, 69.2850], [41.3380, 69.3340], [41.3250, 69.2400], [41.2900, 69.2600], [41.2300, 69.2200]];
  for (const [i, row] of L.entries()) {
    const di = row[2], ci = row[9];
    const base = ci !== null ? [Number(centers[ci][4]), Number(centers[ci][5])] : DIST_XY[di];
    await d.update(s.listings).set({ lat: (base[0] + (i % 4) * 0.0015).toFixed(6), lng: (base[1] + (i % 3) * 0.0018).toFixed(6), exactLocationPublic: i % 3 === 0 })
      .where(eq(s.listings.slug, `${slugify(row[0])}-${i + 1}`));
  }
  console.log("Seed tayyor:", L.length, "e'lon,", cs.length, "markaz (barchasi DEMO)");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDemo().then(closeDb).catch((e) => { console.error(e); process.exit(1); });
}
