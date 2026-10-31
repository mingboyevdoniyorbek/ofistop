// Keep each request below the hosting body limit; server still validates and strips metadata.
export async function prepareUpload(file: File): Promise<File> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error("Faqat JPEG, PNG yoki WebP rasm tanlang.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Rasm hajmi 8 MB dan oshmasin.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url;
    try { await img.decode(); } catch { throw new Error("Fayl rasm emas yoki buzilgan"); } // brauzerning inglizcha xabari foydalanuvchiga chiqmasin
    if (img.naturalWidth * img.naturalHeight > 50_000_000) throw new Error("Rasm o‘lchamlari juda katta.");
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(img.naturalWidth * scale); canvas.height = Math.round(img.naturalHeight * scale);
    const context = canvas.getContext('2d'); if (!context) throw new Error("Rasmni tayyorlab bo‘lmadi.");
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Rasm siqilmadi")), 'image/webp', .82));
    if (blob.size > 3 * 1024 * 1024) throw new Error("Rasm juda katta. Kichikroq rasm tanlang.");
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + (blob.type === 'image/webp' ? '.webp' : '.png'), { type: blob.type });
  } finally { URL.revokeObjectURL(url); }
}
