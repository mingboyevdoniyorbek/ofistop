// Rasm brauzerning o'zida kichraytiriladi va siqiladi: har bir so'rov hosting chegarasidan (Vercel ~4.5 MB) kichik bo'lsin.
// Server baribir turini tekshiradi, EXIF/GPS'ni olib tashlaydi va WebP'ga o'giradi.
const TARGET = 3 * 1024 * 1024;

function encode(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareUpload(file: File): Promise<File> {
  // iPhone "Fayllar"dan HEIC/HEIF ham kelishi mumkin — brauzer o'qiy olsa qabul qilamiz.
  if (file.type && !/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type)) throw new Error("Faqat JPEG, PNG yoki WebP rasm tanlang.");
  if (file.size > 40 * 1024 * 1024) throw new Error("Rasm hajmi 40 MB dan oshmasin."); // 40 MB dan katta fayl telefon xotirasini to'ldiradi
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url;
    try { await img.decode(); } catch { throw new Error("Fayl rasm emas yoki buzilgan"); } // brauzerning inglizcha xabari foydalanuvchiga chiqmasin
    if (img.naturalWidth * img.naturalHeight > 50_000_000) throw new Error("Rasm o‘lchamlari juda katta.");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d"); if (!context) throw new Error("Rasmni tayyorlab bo‘lmadi.");
    // Avval 1600 px, WebP; Safari (iPhone) WebP'ga siqa olmaydi va PNG qaytaradi — unda JPEG.
    // Hajm hali katta bo'lsa — sifat, keyin o'lcham bosqichma-bosqich kamaytiriladi.
    for (const [side, quality] of [[1600, 0.82], [1600, 0.7], [1280, 0.7], [1024, 0.65]] as const) {
      const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.round(img.naturalWidth * scale); canvas.height = Math.round(img.naturalHeight * scale);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      let blob = await encode(canvas, "image/webp", quality);
      if (!blob || blob.type !== "image/webp") blob = await encode(canvas, "image/jpeg", quality);
      if (!blob) throw new Error("Rasm siqilmadi");
      if (blob.size <= TARGET) {
        const ext = blob.type === "image/webp" ? ".webp" : blob.type === "image/png" ? ".png" : ".jpg";
        return new File([blob], (file.name.replace(/\.[^.]+$/, "") || "rasm") + ext, { type: blob.type });
      }
    }
    throw new Error("Rasm juda katta. Kichikroq rasm tanlang.");
  } finally { URL.revokeObjectURL(url); }
}
