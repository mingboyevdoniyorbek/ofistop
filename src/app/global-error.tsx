"use client";
// Root layout ham ishlamay qolganda ko'rsatiladi: o'z <html>/<body> teglari bilan, tashqi komponentlarsiz.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="uz">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, textAlign: "center", color: "#0f172a" }}>
        <div style={{ padding: 16 }}>
          <h1 style={{ fontSize: 22 }}>Nimadir noto‘g‘ri ketdi · Что-то пошло не так</h1>
          <p style={{ color: "#475569" }}>Bir necha soniyadan keyin qayta urinib ko‘ring.</p>
          <button onClick={reset} style={{ marginTop: 12, padding: "12px 20px", borderRadius: 12, border: 0, background: "#12308a", color: "#fff", fontWeight: 600 }}>Qayta urinish</button>
          {" "}<a href="/" style={{ marginLeft: 8, color: "#12308a" }}>OfisTop</a>
        </div>
      </body>
    </html>
  );
}
