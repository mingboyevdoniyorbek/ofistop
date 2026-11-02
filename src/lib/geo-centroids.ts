/**
 * Hudud va tumanlarning taxminiy markazlari — e'lon formasida hudud/tuman tanlanganda xaritani o'sha joyga yaqinlashtirish uchun.
 * Kalit — bazadagi slug (reference-data.ts). Koordinata: [kenglik, uzunlik, zoom].
 */
export const REGION_CENTERS: Record<string, [number, number, number]> = {
  "toshkent-shahri": [41.3111, 69.2797, 12],
  "toshkent-viloyati": [41.0, 69.5, 9],
  samarqand: [39.6542, 66.9597, 12],
  buxoro: [39.7747, 64.4286, 12],
  andijon: [40.7821, 72.3442, 12],
  fargona: [40.3864, 71.7864, 12],
  jizzax: [40.1158, 67.8422, 12],
  namangan: [40.9983, 71.6726, 12],
  navoiy: [40.0844, 65.3792, 12],
  qashqadaryo: [38.8606, 65.7891, 12],
  surxondaryo: [37.2242, 67.2783, 12],
  sirdaryo: [40.4897, 68.7842, 12],
  xorazm: [41.55, 60.6333, 12],
  qoraqalpogiston: [42.46, 59.61, 12],
};

/** Toshkent shahri tumanlari (boshqa hududlar tumanlari admin qo'shganda markaz ma'lum bo'lmasa — hudud markazi ishlatiladi). */
export const DISTRICT_CENTERS: Record<string, [number, number, number]> = {
  chilonzor: [41.2756, 69.2034, 14],
  yunusobod: [41.364, 69.287, 14],
  "mirzo-ulugbek": [41.33, 69.335, 14],
  shayxontohur: [41.326, 69.235, 14],
  yakkasaroy: [41.287, 69.255, 14],
  sergeli: [41.224, 69.22, 14],
  olmazor: [41.353, 69.218, 14],
  bektemir: [41.209, 69.334, 14],
  mirobod: [41.292, 69.288, 14],
  uchtepa: [41.295, 69.17, 14],
  yashnobod: [41.295, 69.34, 14],
  yangihayot: [41.2, 69.17, 14],
};

export function placeCenter(regionSlug?: string | null, districtSlug?: string | null) {
  return (districtSlug && DISTRICT_CENTERS[districtSlug]) || (regionSlug && REGION_CENTERS[regionSlug]) || null;
}
