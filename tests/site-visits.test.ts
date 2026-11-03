import { describe, expect, it } from "vitest";
import { sectionOf, sourceOf } from "@/lib/site-visits";

describe("sayt tashriflari", () => {
  it("yo'l → bo'lim (aniq URL saqlanmaydi)", () => {
    expect(sectionOf("/")).toBe("home"); expect(sectionOf("/ru")).toBe("home");
    expect(sectionOf("/joylar?deal=sale")).toBe("catalog"); expect(sectionOf("/joylar/abc-ofis")).toBe("listing");
    expect(sectionOf("/ru/markazlar/x-y")).toBe("center"); expect(sectionOf("/markazlar")).toBe("centers");
    expect(sectionOf("/mebel/ariza")).toBe("furniture"); expect(sectionOf("/ijara/ofis")).toBe("landing");
    expect(sectionOf("/kabinet/elon/1")).toBe("cabinet"); expect(sectionOf("/biz-haqimizda")).toBe("other");
  });
  it("kirish manbasi", () => {
    expect(sourceOf("https://l.instagram.com/?u=x", "", "ofistop.uz")).toBe("instagram");
    expect(sourceOf("", "instagram", "ofistop.uz")).toBe("instagram");
    expect(sourceOf("https://t.me/ofistop", "", "ofistop.uz")).toBe("telegram");
    expect(sourceOf("https://www.google.com/", "", "ofistop.uz")).toBe("google");
    expect(sourceOf("", "", "ofistop.uz")).toBe("direct");
    expect(sourceOf("https://ofistop.uz/joylar", "", "ofistop.uz")).toBe("direct");
    expect(sourceOf("https://example.com/", "", "ofistop.uz")).toBe("other");
  });
});
