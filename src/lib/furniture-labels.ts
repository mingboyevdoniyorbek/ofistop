// Mebel bo'limi nomlari (server va klient uchun umumiy, DB importi yo'q).
/** Mebel turlari (firma nimalarni taklif qilishi) — ro'yxatda belgi va filtr sifatida. */
export const FURNITURE_PRODUCTS = ["desks", "chairs", "storage", "meeting", "reception", "openspace", "soft"] as const;
export const PRODUCT_LABELS: Record<(typeof FURNITURE_PRODUCTS)[number], { uz: string; ru: string; icon: string }> = {
  desks: { uz: "Ish stollari", ru: "Рабочие столы", icon: "🖥" },
  chairs: { uz: "Kreslo va stullar", ru: "Кресла и стулья", icon: "🪑" },
  storage: { uz: "Shkaf va javonlar", ru: "Шкафы и стеллажи", icon: "🗄" },
  meeting: { uz: "Majlis zali", ru: "Переговорные", icon: "👥" },
  reception: { uz: "Qabulxona", ru: "Ресепшн", icon: "🛎" },
  openspace: { uz: "Open-space to‘plamlari", ru: "Open-space комплекты", icon: "🧩" },
  soft: { uz: "Yumshoq mebel", ru: "Мягкая мебель", icon: "🛋" },
};
export const KIND_LABELS = {
  ready: { uz: "Tayyor mebel sotadi", ru: "Продаёт готовую мебель" },
  custom: { uz: "Buyurtma asosida tayyorlaydi", ru: "Изготавливает на заказ" },
  both: { uz: "Tayyor va buyurtma asosida", ru: "Готовая и на заказ" },
} as const;

