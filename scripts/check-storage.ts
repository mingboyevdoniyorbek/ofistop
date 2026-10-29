import "./load-env";
import sharp from "sharp";
import { storeImage, getObject, deleteObject } from "../src/lib/storage";
async function main() {
  if (!["r2", "s3"].includes(process.env.STORAGE_DRIVER ?? "")) throw new Error("Set STORAGE_DRIVER=r2 first");
  const input = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#173488" } }).jpeg().toBuffer();
  const image = await storeImage(input);
  try {
    for (const key of [image.key, image.thumbKey]) {
      const bytes = await getObject(key);
      if (!bytes || (await sharp(bytes).metadata()).format !== "webp") throw new Error("Read verification failed");
    }
  } finally { await Promise.all([deleteObject(image.key), deleteObject(image.thumbKey)]); }
  if (await getObject(image.key) || await getObject(image.thumbKey)) throw new Error("Delete verification failed");
  console.log("R2: upload, read WebP, delete, confirm missing: PASS");
}
main().catch(() => { console.error("R2 check failed. Check STORAGE_DRIVER and R2_* variables; no secrets logged."); process.exitCode = 1; });
