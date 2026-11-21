/**
 * Toshkent metrosi bekatlari: [nomi, kenglik, uzunlik, liniya]. Koordinatalar — OpenStreetMap (ODbL) ma'lumotlari asosida.
 * Eng yaqin bekat va piyoda vaqti e'lon koordinatasidan hisoblanadi (tashqi xizmatsiz).
 */
export type MetroLine = "chilonzor" | "uzbekiston" | "yunusobod" | "halqa";
export const METRO: readonly (readonly [string, number, number, MetroLine])[] = [
  ["Novza", 41.29187, 69.22362, "chilonzor"],
  ["Xalqlar do'stligi", 41.31190, 69.24310, "chilonzor"],
  ["Mirzo Ulug'bek", 41.28203, 69.21258, "chilonzor"],
  ["Chilonzor", 41.27436, 69.20497, "chilonzor"],
  ["Milliy bog'", 41.30339, 69.23567, "chilonzor"],
  ["G'afur G'ulom", 41.32788, 69.24583, "uzbekiston"],
  ["Chorsu", 41.32586, 69.23682, "uzbekiston"],
  ["Oybek", 41.29801, 69.27405, "uzbekiston"],
  ["Mingo'rik", 41.29966, 69.27441, "yunusobod"],
  ["Toshkent", 41.29329, 69.28772, "uzbekiston"],
  ["Beruniy", 41.34462, 69.20620, "uzbekiston"],
  ["Shahriston", 41.35312, 69.28811, "yunusobod"],
  ["Mashinasozlar", 41.29898, 69.30513, "uzbekiston"],
  ["Tinchlik", 41.33230, 69.21912, "uzbekiston"],
  ["Abdulla Qodiriy", 41.32019, 69.28176, "yunusobod"],
  ["Minor", 41.32689, 69.28342, "yunusobod"],
  ["Bodomzor", 41.33717, 69.28457, "yunusobod"],
  ["Hamid Olimjon", 41.31816, 69.29574, "chilonzor"],
  ["Kosmonavtlar", 41.30516, 69.26472, "uzbekiston"],
  ["Buyuk Ipak Yo'li", 41.32611, 69.32856, "chilonzor"],
  ["Pushkin", 41.32195, 69.31110, "chilonzor"],
  ["Amir Temur xiyoboni", 41.31267, 69.28327, "chilonzor"],
  ["Yunus Rajabiy", 41.31389, 69.28351, "yunusobod"],
  ["Alisher Navoiy", 41.31892, 69.25430, "uzbekiston"],
  ["Paxtakor", 41.31779, 69.25509, "chilonzor"],
  ["O'zbekiston", 41.31194, 69.25341, "uzbekiston"],
  ["Olmazor", 41.25667, 69.19610, "chilonzor"],
  ["Do'stlik", 41.29364, 69.32224, "uzbekiston"],
  ["Mustaqillik maydoni", 41.31495, 69.27106, "chilonzor"],
  ["Yunusobod", 41.36684, 69.29230, "yunusobod"],
  ["Turkiston", 41.37752, 69.29602, "yunusobod"],
  ["Olmos", 41.28171, 69.36033, "halqa"],
  ["Texnopark", 41.29463, 69.32319, "halqa"],
  ["Yashnobod", 41.29759, 69.34978, "halqa"],
  ["Tuzel", 41.29201, 69.35618, "halqa"],
  ["Rohat", 41.26529, 69.36475, "halqa"],
  ["Yangiobod", 41.25651, 69.35872, "halqa"],
  ["Qo'yliq", 41.23746, 69.32700, "halqa"],
  ["Matonat", 41.24447, 69.30832, "halqa"],
  ["Qiyot", 41.24448, 69.29973, "halqa"],
  ["Choshtepa", 41.23825, 69.19603, "chilonzor"],
  ["O'zgarish", 41.22734, 69.20397, "chilonzor"],
  ["Yangihayot", 41.21351, 69.21402, "chilonzor"],
  ["Chinor", 41.20670, 69.21896, "chilonzor"],
  ["Tolarik", 41.24451, 69.28496, "halqa"],
  ["Xonobod", 41.23001, 69.27044, "halqa"],
  ["Quruvchilar", 41.22164, 69.26050, "halqa"],
  ["Qipchok", 41.20542, 69.22141, "halqa"],
  ["Turon", 41.21068, 69.23415, "halqa"],
] as const;

/** Liniya ranglari (sxemadagidek): Chilonzor — qizil, O'zbekiston — ko'k, Yunusobod — yashil, Halqa — sariq. */
export const LINE_COLOR: Record<MetroLine, string> = { chilonzor: "#e3262f", uzbekiston: "#1f5fbf", yunusobod: "#1a9b4b", halqa: "#f2b300" };

/** Piyoda: ~80 m/daqiqa; ko'cha bo'ylab yo'l to'g'ri chiziqdan ~1,3 baravar uzun. */
const WALK_M_PER_MIN = 80, ROUTE_FACTOR = 1.3;
/** Shundan uzoq bo'lsa metro ko'rsatilmaydi (piyoda ~25 daqiqa). */
export const METRO_MAX_MIN = 25;

const distM = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const R = 6_371_000, r = Math.PI / 180;
  const x = (bLng - aLng) * r * Math.cos(((aLat + bLat) / 2) * r), y = (bLat - aLat) * r;
  return Math.sqrt(x * x + y * y) * R;
};

/** Eng yaqin metro bekati va piyoda daqiqasi; 25 daqiqadan uzoq yoki koordinata yo'q bo'lsa — null. */
export function nearestMetro(lat: number | string | null | undefined, lng: number | string | null | undefined) {
  const a = Number(lat), b = Number(lng);
  if (lat == null || lng == null || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  let best: { name: string; line: MetroLine; meters: number } | null = null;
  for (const [name, sl, sg, line] of METRO) { const m = distM(a, b, sl, sg); if (!best || m < best.meters) best = { name, line, meters: m }; }
  if (!best) return null;
  const minutes = Math.max(1, Math.round((best.meters * ROUTE_FACTOR) / WALK_M_PER_MIN));
  return minutes > METRO_MAX_MIN ? null : { ...best, minutes, color: LINE_COLOR[best.line] };
}

/** «Metroga N daqiqagacha» filtri uchun to'g'ri chiziqdagi eng katta masofa (metr). */
export const metroRadiusM = (minutes: number) => Math.round((minutes * WALK_M_PER_MIN) / ROUTE_FACTOR);

/** Bekatlarning ruscha nomlari (qidiruv tizimlari uchun: «аренда офиса у метро Ойбек»). */
export const METRO_RU: Record<string, string> = {
  "Novza": "Новза", "Xalqlar do'stligi": "Халклар Дустлиги", "Mirzo Ulug'bek": "Мирзо Улугбек", "Chilonzor": "Чиланзар", "Milliy bog'": "Миллий бог",
  "G'afur G'ulom": "Гафур Гулям", "Chorsu": "Чорсу", "Oybek": "Ойбек", "Mingo'rik": "Мингурик", "Toshkent": "Ташкент", "Beruniy": "Беруни",
  "Shahriston": "Шахристан", "Mashinasozlar": "Машинасозлар", "Tinchlik": "Тинчлик", "Abdulla Qodiriy": "Абдулла Кадыри", "Minor": "Минор",
  "Bodomzor": "Бадамзар", "Hamid Olimjon": "Хамид Алимджан", "Kosmonavtlar": "Космонавтлар", "Buyuk Ipak Yo'li": "Буюк Ипак Йули", "Pushkin": "Пушкин",
  "Amir Temur xiyoboni": "Амир Темур хиёбони", "Yunus Rajabiy": "Юнус Раджаби", "Alisher Navoiy": "Алишер Навои", "Paxtakor": "Пахтакор",
  "O'zbekiston": "Узбекистан", "Olmazor": "Алмазар", "Do'stlik": "Дустлик", "Mustaqillik maydoni": "Мустакиллик майдони", "Yunusobod": "Юнусабад",
  "Turkiston": "Туркистан", "Olmos": "Олмос", "Texnopark": "Технопарк", "Yashnobod": "Яшнабад", "Tuzel": "Тузель", "Rohat": "Рохат",
  "Yangiobod": "Янгиабад", "Qo'yliq": "Куйлюк", "Matonat": "Матонат", "Qiyot": "Кият", "Choshtepa": "Чоштепа", "O'zgarish": "Узгариш",
  "Yangihayot": "Янгихаёт", "Chinor": "Чинор", "Tolarik": "Толарик", "Xonobod": "Ханабад", "Quruvchilar": "Курувчилар", "Qipchok": "Кипчак", "Turon": "Туран",
};
/** Bekat manzili (URL): «Xalqlar do'stligi» → «xalqlar-dostligi». */
export const metroSlug = (name: string) => name.toLowerCase().replace(/['‘’ʻ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const metroBySlug = (slug: string) => METRO.find(([n]) => metroSlug(n) === slug) ?? null;
/** Bekat atrofidagi «metro yonida» sahifasi radiusi (metr, ~15 daqiqa piyoda). */
export const METRO_PAGE_RADIUS_M = 1200;
