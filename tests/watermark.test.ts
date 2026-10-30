import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { writeFileSync } from "fs";
import { processImage } from "../src/lib/storage";

const plain = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: "#88aaaa" } }).jpeg().toBuffer();
const pixel = async (buf: Buffer, x: number, y: number) => {
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * 3; return [data[i], data[i + 1], data[i + 2]];
};

describe("rasm belgisi (watermark)", () => {
  it("asosiy rasmning pastki o'ng burchagiga qo'yiladi, yuqori chap burchak o'zgarmaydi", async () => {
    const r = await processImage(await plain(1200, 900));
    if (process.env.WM_OUT) writeFileSync(process.env.WM_OUT, await sharp(r.main).png().toBuffer());
    const [tl] = await pixel(r.main, 20, 20);
    expect(Math.abs(tl - 0x88)).toBeLessThan(12);
    // belgi foni to'q ko'k: pastki o'ng hududda rang sezilarli o'zgaradi
    const corner = await pixel(r.main, r.width - 60, r.height - 50);
    expect(Math.abs(corner[0] - 0x88) + Math.abs(corner[1] - 0xaa)).toBeGreaterThan(40);
  });
  it("tik (portrait) va kichik rasmlarda ham rasm chegarasidan chiqmaydi", async () => {
    for (const [w, h] of [[600, 1400], [220, 160]]) {
      const r = await processImage(await plain(w, h));
      expect(r.width).toBe(w); expect(r.height).toBe(h);
    }
  });
});
