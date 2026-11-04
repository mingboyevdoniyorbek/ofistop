// Rasm brauzerning o'zida kichraytiriladi va siqiladi: har bir so'rov hosting chegarasidan (Vercel ~4.5 MB) kichik bo'lsin.
// Server baribir turini tekshiradi, EXIF/GPS'ni olib tashlaydi va WebP'ga o'giradi.
const TARGET = 3 * 1024 * 1024;
/** Brauzer o'qiy olmagan faylni o'zgartirmasdan yuborish mumkin bo'lgan eng katta hajm (server o'zi siqadi). */
const RAW_LIMIT = 4 * 1024 * 1024;

type Source = { draw: CanvasImageSource; w: number; h: number; close: () => void };

function encode(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Rasmni o'qishning bir necha usuli. Samsung va boshqa Android telefonlarning 50–200 MP suratlarini
 * `img.decode()` ko'pincha o'qiy olmaydi — shuning uchun avval createImageBitmap (to'liq, keyin kichraytirib),
 * so'ng oddiy <img> yuklash sinab ko'riladi. Barchasi muvaffaqiyatsiz bo'lsa — null.
 */
async function decode(file: File): Promise<Source | null> {
  if (typeof createImageBitmap === "function") {
    for (const opts of [undefined, { resizeWidth: 2048, resizeQuality: "high" as const }]) {
      try {
        const bmp = opts ? await createImageBitmap(file, opts) : await createImageBitmap(file);
        if (bmp.width > 0 && bmp.height > 0) return { draw: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
        bmp.close();
      } catch { /* keyingi usul */ }
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image(); el.onload = () => resolve(el); el.onerror = reject; el.src = url;
    });
    if (!img.naturalWidth || !img.naturalHeight) { URL.revokeObjectURL(url); return null; }
    return { draw: img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch { URL.revokeObjectURL(url); return null; }
}

export async function prepareUpload(file: File): Promise<File> {
  // iPhone "Fayllar"dan HEIC/HEIF ham kelishi mumkin — brauzer o'qiy olsa qabul qilamiz.
  if (file.type && !/^image\//i.test(file.type)) throw new Error("Faqat rasm (JPEG, PNG yoki WebP) tanlang.");
  if (file.size === 0) throw new Error("Fayl bo‘sh. Rasmni qaytadan tanlang.");
  if (file.size > 40 * 1024 * 1024) throw new Error("Rasm hajmi 40 MB dan oshmasin."); // 40 MB dan katta fayl telefon xotirasini to'ldiradi
  const src = await decode(file);
  if (!src) {
    // Brauzer o'qiy olmadi: kichik JPEG/PNG/WebP bo'lsa, asl holida yuboramiz — server (sharp) o'zi o'qib siqadi.
    if (file.size <= RAW_LIMIT && /^image\/(jpeg|png|webp)$/i.test(file.type)) return file;
    throw new Error("Telefon bu rasmni ocha olmadi. Galereyadan boshqa rasm tanlang yoki skrinshot qilib yuklang.");
  }
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d"); if (!context) throw new Error("Rasmni tayyorlab bo‘lmadi.");
    // Avval 1600 px, WebP; Safari (iPhone) WebP'ga siqa olmaydi va PNG qaytaradi — unda JPEG.
    // Hajm hali katta bo'lsa — sifat, keyin o'lcham bosqichma-bosqich kamaytiriladi.
    for (const [side, quality] of [[1600, 0.82], [1600, 0.7], [1280, 0.7], [1024, 0.65]] as const) {
      const scale = Math.min(1, side / Math.max(src.w, src.h));
      canvas.width = Math.max(1, Math.round(src.w * scale)); canvas.height = Math.max(1, Math.round(src.h * scale));
      context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); // shaffof PNG qora bo'lib qolmasin
      context.drawImage(src.draw, 0, 0, canvas.width, canvas.height);
      let blob = await encode(canvas, "image/webp", quality);
      if (!blob || blob.type !== "image/webp" || blob.size < 100) blob = await encode(canvas, "image/jpeg", quality);
      if (!blob || blob.size < 100) {
        if (file.size <= RAW_LIMIT && /^image\/(jpeg|png|webp)$/i.test(file.type)) return file;
        throw new Error("Rasmni siqib bo‘lmadi. Boshqa rasm tanlang.");
      }
      if (blob.size <= TARGET) {
        const ext = blob.type === "image/webp" ? ".webp" : blob.type === "image/png" ? ".png" : ".jpg";
        return new File([blob], (file.name.replace(/\.[^.]+$/, "") || "rasm") + ext, { type: blob.type });
      }
    }
    throw new Error("Rasm juda katta. Kichikroq rasm tanlang.");
  } finally { src.close(); }
}
