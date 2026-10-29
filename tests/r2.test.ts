import { afterEach, expect, test, vi } from "vitest";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { putObject, getObject, deleteObject, StorageError } from "../src/lib/storage";
const key = "img/12345678-1234-1234-1234-123456789abc.webp";
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
function configure() {
  vi.stubEnv("STORAGE_DRIVER", "r2"); vi.stubEnv("R2_ENDPOINT", "https://example.r2.cloudflarestorage.com");
  vi.stubEnv("R2_BUCKET", "test-bucket"); vi.stubEnv("R2_ACCESS_KEY_ID", "test"); vi.stubEnv("R2_SECRET_ACCESS_KEY", "test");
}
test("R2 writes WebP, reads bytes and deletes the same private object key", async () => {
  configure(); const bytes = Buffer.from("image");
  const send = vi.spyOn(S3Client.prototype, "send").mockImplementation((async (command: unknown) => {
    if (command instanceof GetObjectCommand) return { Body: { transformToByteArray: async () => bytes } };
    return {};
  }) as any);
  await putObject(key, bytes); expect(await getObject(key)).toEqual(bytes); await deleteObject(key);
  expect(send.mock.calls.map(c => c[0].constructor)).toEqual([PutObjectCommand, GetObjectCommand, DeleteObjectCommand]);
  expect(send.mock.calls[0][0].input).toMatchObject({ Bucket: "test-bucket", Key: key, ContentType: "image/webp", Body: bytes });
});
test("R2 missing keys fail clearly; forbidden keys never reach storage", async () => {
  configure(); vi.stubEnv("R2_BUCKET", "");
  await expect(putObject(key, Buffer.from("x"))).rejects.toBeInstanceOf(StorageError);
  expect(await getObject("../../secret")).toBeNull();
});
test("R2 distinguishes not found from provider failure and hides provider secrets", async () => {
  configure(); const send = vi.spyOn(S3Client.prototype, "send");
  send.mockRejectedValueOnce({ $metadata: { httpStatusCode: 404 } } as never);
  expect(await getObject(key)).toBeNull();
  send.mockRejectedValueOnce(new Error("private credentials") as never);
  await expect(getObject(key)).rejects.toThrow(StorageError);
  send.mockRejectedValueOnce(new Error("private credentials") as never);
  await expect(putObject(key, Buffer.from("x"))).rejects.not.toThrow("private credentials");
});
test("Vercel cannot silently fall back to its ephemeral local disk", async () => {
  vi.stubEnv("STORAGE_DRIVER", "local"); vi.stubEnv("VERCEL", "1");
  await expect(putObject(key, Buffer.from("x"))).rejects.toThrow(StorageError);
});
