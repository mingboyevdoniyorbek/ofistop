import { expect, test } from 'vitest';
import sharp from 'sharp';
import { processImage, MAX_IMAGE_BYTES } from '../src/lib/storage';

// Deterministic high-detail input: a harder compression case than a solid test image.
function pixels(width: number, height: number) {
  const buffer = Buffer.alloc(width * height * 3);
  let seed = 123456789;
  for (let i = 0; i < buffer.length; i++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    buffer[i] = seed & 255;
  }
  return sharp(buffer, { raw: { width, height, channels: 3 } });
}

test.each(['jpeg', 'png'] as const)('compresses a 2–5 MB %s with bounded dimensions and stripped metadata', async format => {
  const input = format === 'jpeg'
    ? await pixels(2400, 1800).withMetadata({ orientation: 6 }).jpeg({ quality: 90 }).toBuffer()
    : await pixels(1200, 800).png().toBuffer();
  expect(input.length).toBeGreaterThan(2 * 1024 * 1024);
  expect(input.length).toBeLessThan(5 * 1024 * 1024);
  const result = await processImage(input);
  expect(result.main.length + result.thumb.length).toBeLessThan(input.length / 2);
  const main = await sharp(result.main).metadata();
  const thumb = await sharp(result.thumb).metadata();
  for (const [meta, limit] of [[main, 1600], [thumb, 480]] as const) {
    expect(meta.format).toBe('webp');
    expect(meta.width).toBeLessThanOrEqual(limit);expect(meta.height).toBeLessThanOrEqual(limit);
    expect(meta.exif).toBeUndefined();expect(meta.icc).toBeUndefined();expect(meta.orientation).toBeUndefined();
  }
  if (format === 'jpeg') { expect(main.width).toBe(1200);expect(main.height).toBe(1600); }
  expect(result.width).toBe(main.width);expect(result.height).toBe(main.height);
  console.info(`${format}: ${input.length} bytes -> main ${result.main.length}, thumbnail ${result.thumb.length}`);
}, 15000);

test('does not enlarge small pictures and still rejects invalid or oversized input', async () => {
  const input = await pixels(200, 150).png().toBuffer();
  const result = await processImage(input);
  expect([result.width, result.height]).toEqual([200, 150]);
  await expect(processImage(Buffer.from('not an image'))).rejects.toThrow('Fayl rasm emas');
  await expect(processImage(Buffer.alloc(MAX_IMAGE_BYTES + 1))).rejects.toThrow('8 MB');
});
