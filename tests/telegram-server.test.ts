import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { createTelegramServer } from "../src/lib/telegram-server";
const secret = "s".repeat(64), handle = vi.fn(async (_update: unknown) => {});
let ready = false, url = "";
const server = createTelegramServer(secret, handle, () => ready);
beforeAll(async () => { await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve)); url = `http://127.0.0.1:${(server.address() as {port:number}).port}`; });
afterAll(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
const post = (body: string, token = secret) => fetch(url + "/telegram/webhook", { method: "POST", headers: { "x-telegram-bot-api-secret-token": token }, body });
test("Render health reflects webhook registration readiness", async () => {
  expect((await fetch(url + "/health")).status).toBe(503); ready = true;
  expect(await (await fetch(url + "/health")).text()).toBe("ok");
});
test("unauthenticated and invalid updates cannot invoke the bot", async () => {
  expect((await post('{"update_id":1}', "wrong")).status).toBe(403);
  expect((await post("invalid json")).status).toBe(400);
  expect((await post("{}")).status).toBe(400);
  expect((await post("x".repeat(270000))).status).toBe(413);
  expect(handle).not.toHaveBeenCalled();
});
test("Render executes the handler and signals retry on failure", async () => {
  const update = { update_id: 4, message: { text: "/start" } };
  expect((await post(JSON.stringify(update))).status).toBe(200);
  expect(handle).toHaveBeenCalledWith(update);
  handle.mockRejectedValueOnce(new Error("database down"));
  expect((await post(JSON.stringify(update))).status).toBe(500);
});
