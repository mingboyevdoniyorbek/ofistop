// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { popup, type Marker } from "@/components/map-popup";
import { loadLeaflet, pinIcon } from "@/components/leaflet-setup";

const base: Marker = { id: "1", href: "/joylar/1-x", title: "Oddiy", category: "Alohida ofis", area: 40, price: "500 USD / oy", total: null, thumb: null, lat: 41.3, lng: 69.2, approx: true, radiusM: 500 };

describe("xarita popup (XSS)", () => {
  it("zararli sarlavha HTML sifatida talqin qilinmaydi", () => {
    const el = popup({ ...base, title: '<img src=x onerror="window.__pwned=1"><script>window.__pwned=1</script>', price: "<b>1</b>", category: "<i>x</i>" });
    expect(el.querySelector("script")).toBeNull();
    expect(el.querySelector("[onerror]")).toBeNull();
    expect(el.querySelector("b")).toBeNull();
    expect(el.textContent).toContain("<script>");        // matn sifatida ko'rinadi
    expect(el.querySelector("a")!.getAttribute("href")).toBe("/joylar/1-x");
  });
  it("taxminiy joylashuv izohi va rasm", () => {
    const el = popup({ ...base, thumb: "/media/a/b-t.webp", total: "Jami: 1 000 USD / oy" });
    expect(el.textContent).toContain("Taxminiy joylashuv");
    expect(el.querySelector("img")!.getAttribute("src")).toBe("/media/a/b-t.webp");
    expect(el.textContent).toContain("Jami: 1 000 USD / oy");
  });
});

describe("Leaflet + markercluster (jsdom)", () => {
  it("xarita, klaster va markerlar xatosiz yaratiladi", async () => {
    const L = await loadLeaflet();
    const div = document.createElement("div"); div.style.cssText = "width:600px;height:400px"; document.body.append(div);
    const map = L.map(div, { center: [41.31, 69.24], zoom: 11, maxZoom: 19 }); // ListingMap bilan bir xil opsiyalar
    L.tileLayer("https://tile.example/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    const cluster = L.markerClusterGroup();
    for (let i = 0; i < 50; i++) cluster.addLayer(L.marker([41.3 + i * 0.001, 69.2 + i * 0.001], { icon: pinIcon(L, i % 2 === 0) }).bindPopup(popup({ ...base, title: `E'lon ${i}` })));
    map.addLayer(cluster);
    expect(cluster.getLayers().length).toBe(50);
    map.fitBounds(cluster.getBounds().pad(0.1), { maxZoom: 15 });
    map.remove();
  });
});
