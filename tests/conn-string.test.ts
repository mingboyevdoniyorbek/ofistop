import { expect, test } from "vitest";
import { normalizeConnectionString as n } from "../src/db/conn-string";
test("sslmode=require verify-full ga aniq almashtiriladi (pg SECURITY WARNING chiqmaydi)", () => {
  expect(n("postgres://u:p@h/db?sslmode=require")).toBe("postgres://u:p@h/db?sslmode=verify-full");
  expect(n("postgres://u:p@h/db?sslmode=require&channel_binding=require")).toBe("postgres://u:p@h/db?sslmode=verify-full&channel_binding=require");
  expect(n("postgres://u:p@h/db?x=1&sslmode=prefer")).toBe("postgres://u:p@h/db?x=1&sslmode=verify-full");
  expect(n("postgres://u:p@h/db?sslmode=disable")).toBe("postgres://u:p@h/db?sslmode=disable");
  expect(n("postgres://u:p@h/db?sslmode=require&uselibpqcompat=true")).toBe("postgres://u:p@h/db?sslmode=require&uselibpqcompat=true");
  expect(n("postgres://127.0.0.1/db")).toBe("postgres://127.0.0.1/db");
});
