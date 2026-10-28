// Rasm saqlash adapteri. Hozir faqat local (disk). S3 adapteri HALI ULANMAGAN: STORAGE_DRIVER=s3 aniq xato beradi.
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { randomUUID } from "crypto";

export class ImageError extends Error {}
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGES = 15;
export const MAX_UPLOAD_BYTES = 90 * 1024 * 1024;
export const KEY_RE = /^img\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.thumb)?\.webp$/;

function root() {
  if ((process.env.STORAGE_DRIVER ?? "local") !== "local") throw new Error("S3 adapteri hali ulanmagan. STORAGE_DRIVER=local ishlating.");
  return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./uploads");
}
export async function putObject(key: string, buf: Buffer) {
  if (!KEY_RE.test(key)) throw new Error("Noto'g'ri kalit");
  const p = path.join(root(), key); await fs.mkdir(path.dirname(p), { recursive: true }); await fs.writeFile(p, buf);
}
export async function getObject(key: string): Promise<Buffer | null> {
  if (!KEY_RE.test(key)) return null;
  return fs.readFile(path.join(root(), key)).catch(() => null);
}
export async function deleteObject(key: string) {
  if (KEY_RE.test(key)) await fs.unlink(path.join(root(), key)).catch(() => {});
}

/** Haqiqiy tur sharp orqali aniqlanadi (fayl nomi/Content-Type'ga ishonilmaydi). EXIF/GPS metama'lumot chiqishda yo'q. */
export async function processImage(input: Buffer) {
  if (input.length === 0 || input.length > MAX_IMAGE_BYTES) throw new ImageError(`Fayl hajmi 8 MB dan oshmasligi kerak`);
  let meta;
  try { meta = await sharp(input, { limitInputPixels: 50_000_000 }).metadata(); } catch { throw new ImageError("Fayl rasm emas yoki buzilgan"); }
  if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format)) throw new ImageError("Faqat JPEG, PNG yoki WebP qabul qilinadi");
  if ((meta.width ?? 0) < 200 || (meta.height ?? 0) < 150) throw new ImageError("Rasm juda kichik (kamida 200×150 px)");
  const base = () => sharp(input, { limitInputPixels: 50_000_000 }).rotate(); // EXIF yo'nalishini qo'llaydi; metadata eksport qilinmaydi
  // Store compressed derivatives only; never retain the original 2–5 MB upload.
  const main = await base().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80, effort: 5 }).toBuffer({ resolveWithObject: true });
  // Bound both axes so portrait photos also produce small catalogue thumbnails.
  const thumb = await base().resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true }).webp({ quality: 72, effort: 5 }).toBuffer();
  return { main: main.data, thumb, width: main.info.width, height: main.info.height };
}

export async function storeImage(input: Buffer) {
  const p = await processImage(input); const id = randomUUID();
  const key = `img/${id}.webp`, thumbKey = `img/${id}.thumb.webp`;
  try { await putObject(key, p.main); await putObject(thumbKey, p.thumb); }
  catch (e) { await Promise.all([deleteObject(key), deleteObject(thumbKey)]); throw e; }
  return { key, thumbKey, width: p.width, height: p.height };
}
export const mediaUrl = (key: string | null | undefined) => (key && KEY_RE.test(key) ? `/api/media/${key}` : null);
