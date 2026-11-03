/**
 * OfisTop stikerlari: emoji o'rniga o'zimizning rangli SVG rasmlar (bosh sahifa blokchalari, mebel bo'limi).
 * Har birida soya, gradient va yorug'lik aksi bor — barcha qurilmalarda bir xil va aniq ko'rinadi.
 * `uid` — gradient ID'lari sahifada takrorlanmasligi uchun (bir sahifada bir nechta nusxa bo'lsa).
 */
type P = { className?: string; uid?: string };

/** Biznes markaz: ikkita oynali minora, chiroqlari yoqilgan derazalar va daraxt. */
export function CenterSticker({ className = "h-10 w-10", uid = "bc" }: P) {
  const win: [number, number, boolean][] = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) win.push([28 + c * 6, 12 + r * 6, (r * 3 + c) % 5 === 1]);
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-a`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#60a5fa" /><stop offset="1" stopColor="#1e3a8a" /></linearGradient>
        <linearGradient id={`${uid}-b`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5eead4" /><stop offset="1" stopColor="#0f766e" /></linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="25" ry="3" fill="#0f172a" opacity=".13" />
      <rect x="9" y="22" width="19" height="35" rx="3" fill={`url(#${uid}-b)`} />
      {[25, 31, 37, 43].map((y) => [12.5, 19.5].map((x) => <rect key={`${x}${y}`} x={x} y={y} width="4" height="3" rx=".8" fill="#ccfbf1" opacity=".9" />))}
      <rect x="24" y="7" width="25" height="50" rx="3" fill={`url(#${uid}-a)`} />
      <path d="M36.5 1.5v5.5" stroke="#1e3a8a" strokeWidth="1.6" strokeLinecap="round" /><circle cx="36.5" cy="1.8" r="1.4" fill="#f43f5e" />
      {win.map(([x, y, lit]) => <rect key={`${x}-${y}`} x={x} y={y} width="4" height="3.2" rx=".8" fill={lit ? "#fde68a" : "#dbeafe"} opacity={lit ? 1 : 0.85} />)}
      <path d="M24 30 L49 12 V20 L24 38Z" fill="#fff" opacity=".14" />
      <rect x="33.5" y="49" width="6" height="8" rx="1.2" fill="#0f172a" opacity=".45" />
      <rect x="51.3" y="49" width="1.8" height="8" rx=".9" fill="#92400e" />
      <circle cx="52.2" cy="46" r="6" fill="#22c55e" /><circle cx="50" cy="44" r="2.4" fill="#4ade80" opacity=".8" />
    </svg>
  );
}

/** Sotuv: oltin kalit va yashil uycha yorlig'i. */
export function SaleSticker({ className = "h-10 w-10", uid = "sale" }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fde68a" /><stop offset=".55" stopColor="#f59e0b" /><stop offset="1" stopColor="#b45309" /></linearGradient>
        <linearGradient id={`${uid}-t`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor="#047857" /></linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="22" ry="3" fill="#0f172a" opacity=".12" />
      <path d="M17 14 C12 20 14 28 21 30" fill="none" stroke="#64748b" strokeWidth="1.4" strokeLinecap="round" />
      <g transform="rotate(-12 44 20)">
        <path d="M36 12 h16 a3 3 0 0 1 3 3 v12 a3 3 0 0 1 -3 3 h-16 l-6 -9 z" fill={`url(#${uid}-t)`} />
        <circle cx="34.5" cy="21" r="1.6" fill="#ecfdf5" />
        <path d="M40 23 l5 -4.5 l5 4.5 v4.5 h-10z" fill="#fff" /><rect x="43.7" y="24.5" width="2.6" height="3" rx=".5" fill="#059669" />
      </g>
      <g transform="rotate(45 24 34)">
        <circle cx="24" cy="22" r="11" fill={`url(#${uid}-g)`} />
        <circle cx="24" cy="22" r="4.6" fill="#fff" />
        <circle cx="20.5" cy="17.5" r="2.4" fill="#fff" opacity=".45" />
        <rect x="21" y="31" width="6" height="25" rx="3" fill={`url(#${uid}-g)`} />
        <rect x="27" y="43" width="6" height="3.6" rx="1.2" fill="#d97706" /><rect x="27" y="49.5" width="4.5" height="3.6" rx="1.2" fill="#d97706" />
        <rect x="22.3" y="32" width="1.6" height="22" rx=".8" fill="#fff" opacity=".35" />
      </g>
    </svg>
  );
}

/** Mebel: hashamatli Chesterfield divan — baxmal, tugmachali suyanchiq, yostiqlar va oltin oyoqlar. */
export function SofaSticker({ className = "h-10 w-10", uid = "sofa" }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-v`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2dd4bf" /><stop offset=".45" stopColor="#0f766e" /><stop offset="1" stopColor="#134e4a" /></linearGradient>
        <linearGradient id={`${uid}-s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#14b8a6" /><stop offset="1" stopColor="#0f5e57" /></linearGradient>
        <linearGradient id={`${uid}-p`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fffbeb" /><stop offset="1" stopColor="#fcd34d" /></linearGradient>
      </defs>
      <ellipse cx="32" cy="56" rx="27" ry="3" fill="#0f172a" opacity=".14" />
      {/* suyanchiq: tepasi biroz yoysimon */}
      <path d="M11 38 V22 C11 15 16 13 32 13 C48 13 53 15 53 22 V38 Z" fill={`url(#${uid}-v)`} />
      {/* tugmachali (capitonné) naqsh */}
      <path d="M16 20 L22 26 L28 20 L34 26 L40 20 L46 26 M16 32 L22 26 L28 32 L34 26 L40 32 L46 26 L50 30" fill="none" stroke="#042f2e" strokeWidth=".8" opacity=".35" />
      {[[22, 26], [34, 26], [46, 26], [16, 20], [28, 20], [40, 20], [28, 32], [40, 32], [16, 32]].map(([x, y]) => <g key={`${x}${y}`}><circle cx={x} cy={y} r="1.3" fill="#042f2e" opacity=".55" /><circle cx={x - 0.35} cy={y - 0.4} r=".45" fill="#99f6e4" /></g>)}
      <path d="M15 16 C22 14.5 42 14.5 49 16" stroke="#99f6e4" strokeWidth="1.4" strokeLinecap="round" opacity=".55" fill="none" />
      {/* o'rindiq */}
      <rect x="9" y="35" width="46" height="12" rx="5" fill={`url(#${uid}-s)`} />
      <path d="M32 36 V46" stroke="#042f2e" strokeWidth=".8" opacity=".3" />
      <path d="M13 37.5 H51" stroke="#5eead4" strokeWidth="1.1" strokeLinecap="round" opacity=".5" />
      {/* o'ralgan (rolled) qo'ltiqlar */}
      <rect x="3" y="26" width="11" height="22" rx="5.5" fill={`url(#${uid}-v)`} /><rect x="50" y="26" width="11" height="22" rx="5.5" fill={`url(#${uid}-v)`} />
      <ellipse cx="8.5" cy="28.5" rx="5" ry="3" fill="#2dd4bf" opacity=".55" /><ellipse cx="55.5" cy="28.5" rx="5" ry="3" fill="#2dd4bf" opacity=".55" />
      {/* yostiqlar */}
      <rect x="15" y="26" width="12" height="10" rx="3" transform="rotate(-10 21 31)" fill={`url(#${uid}-p)`} />
      <rect x="37" y="26" width="12" height="10" rx="3" transform="rotate(10 43 31)" fill={`url(#${uid}-p)`} />
      <path d="M17.5 30 l7 -1.2 M39.5 28.8 l7 1.2" stroke="#d97706" strokeWidth=".8" opacity=".55" />
      {/* oltin oyoqlar */}
      <path d="M11 47 l1 6.5 h2.6 l1 -6.5 Z M48.4 47 l1 6.5 h2.6 l1 -6.5 Z" fill="#d97706" />
      <circle cx="13.3" cy="53.6" r="1.2" fill="#fbbf24" /><circle cx="50.7" cy="53.6" r="1.2" fill="#fbbf24" />
    </svg>
  );
}

/** Kovorking: stol, video-qo'ng'iroqdagi noutbuk, qahva va gul. */
export function CoworkSticker({ className = "h-10 w-10", uid = "cw" }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-w`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d6a26a" /><stop offset="1" stopColor="#92400e" /></linearGradient>
        <linearGradient id={`${uid}-sc`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#93c5fd" /><stop offset="1" stopColor="#2563eb" /></linearGradient>
      </defs>
      <ellipse cx="32" cy="58" rx="26" ry="3" fill="#0f172a" opacity=".12" />
      <rect x="9" y="44" width="2.6" height="12" rx="1" fill="#78350f" /><rect x="52.4" y="44" width="2.6" height="12" rx="1" fill="#78350f" />
      <rect x="4" y="40" width="56" height="5" rx="2.2" fill={`url(#${uid}-w)`} />
      <rect x="15" y="15" width="28" height="20" rx="2.5" fill="#1e293b" />
      <rect x="17" y="17" width="24" height="16" rx="1.5" fill={`url(#${uid}-sc)`} />
      <circle cx="24" cy="23.5" r="2.6" fill="#fde68a" /><path d="M19.5 31 c0-3 2-4.5 4.5-4.5 s4.5 1.5 4.5 4.5z" fill="#fde68a" />
      <circle cx="34.5" cy="23.5" r="2.6" fill="#bbf7d0" /><path d="M30 31 c0-3 2-4.5 4.5-4.5 s4.5 1.5 4.5 4.5z" fill="#bbf7d0" />
      <path d="M17 17 L26 17 L17 26Z" fill="#fff" opacity=".18" />
      <path d="M11 35.5 h36 l3 4.5 h-42z" fill="#cbd5e1" /><rect x="25" y="36" width="8" height="1.4" rx=".7" fill="#94a3b8" />
      <rect x="47" y="30" width="8" height="10" rx="2" fill="#16a34a" /><path d="M55 32.5 a2.6 2.6 0 0 1 0 5" fill="none" stroke="#16a34a" strokeWidth="1.6" />
      <path d="M49.5 27.5 c-1-1.4 1-2.2 0-3.6 M52.5 27.5 c-1-1.4 1-2.2 0-3.6" stroke="#94a3b8" strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <path d="M5.5 33 h7 l-1 7 h-5z" fill="#c2410c" />
      <path d="M9 33 C6 29 5 26 6 23 C8.5 25 9.5 28.5 9 33Z M9 33 C11 28 13.5 26.5 15 26 C14.5 29.5 12 32 9 33Z" fill="#22c55e" />
    </svg>
  );
}

/** Mebel turlari uchun kichik ikonkalar (24×24, gradientsiz — ro'yxatda ko'p marta takrorlanadi). */
export function ProductIcon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const c = { wood: "#b45309", dark: "#334155", blue: "#2563eb", teal: "#0f766e", light: "#e2e8f0", gold: "#f59e0b" };
  const body: Record<string, React.ReactNode> = {
    desks: <><rect x="2" y="12" width="20" height="2.4" rx="1" fill={c.wood} /><rect x="3.5" y="14" width="1.8" height="7" rx=".8" fill={c.dark} /><rect x="18.7" y="14" width="1.8" height="7" rx=".8" fill={c.dark} /><rect x="7" y="4" width="10" height="6.5" rx="1" fill={c.dark} /><rect x="8" y="5" width="8" height="4.5" rx=".6" fill={c.blue} /><rect x="11.2" y="10.4" width="1.6" height="1.8" fill={c.dark} /></>,
    chairs: <><rect x="7" y="2.5" width="10" height="9" rx="3" fill={c.blue} /><rect x="6" y="11.5" width="12" height="3.2" rx="1.6" fill="#1e40af" /><rect x="11.2" y="14.5" width="1.6" height="4" fill={c.dark} /><path d="M6 21.5 l6 -3 l6 3" stroke={c.dark} strokeWidth="1.6" fill="none" strokeLinecap="round" /><circle cx="6" cy="21.5" r="1.1" fill={c.dark} /><circle cx="18" cy="21.5" r="1.1" fill={c.dark} /></>,
    storage: <><rect x="4" y="2.5" width="16" height="19" rx="1.5" fill={c.wood} /><rect x="5.5" y="4" width="13" height="5" rx=".6" fill="#fde68a" /><rect x="5.5" y="10.5" width="6" height="9.5" rx=".6" fill="#d97706" /><rect x="12.5" y="10.5" width="6" height="9.5" rx=".6" fill="#d97706" /><circle cx="10.4" cy="15" r=".7" fill="#fff" /><circle cx="13.6" cy="15" r=".7" fill="#fff" /><rect x="7" y="5.2" width="2" height="2.8" fill={c.blue} /><rect x="9.6" y="5.6" width="2" height="2.4" fill={c.teal} /></>,
    meeting: <><ellipse cx="12" cy="13" rx="8.5" ry="4" fill={c.wood} /><ellipse cx="12" cy="12.4" rx="7.5" ry="3" fill="#d6a26a" />{[[3, 7], [21, 7], [3, 19], [21, 19], [12, 4.5], [12, 21.5]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2" fill={c.blue} />)}</>,
    reception: <><rect x="2.5" y="10" width="19" height="11" rx="1.5" fill={c.teal} /><rect x="2" y="8.5" width="20" height="2.6" rx="1.2" fill={c.light} /><path d="M9 7 a3 3 0 0 1 6 0z" fill={c.gold} /><rect x="8.5" y="7" width="7" height="1.4" rx=".7" fill="#d97706" /><circle cx="12" cy="3.8" r=".9" fill={c.gold} /><rect x="5" y="13" width="14" height="1.4" rx=".7" fill="#5eead4" opacity=".7" /></>,
    openspace: <><rect x="11.2" y="3" width="1.6" height="13" rx=".8" fill="#94a3b8" /><rect x="2" y="11" width="9" height="2" rx=".8" fill={c.wood} /><rect x="13" y="11" width="9" height="2" rx=".8" fill={c.wood} /><rect x="4" y="6.5" width="5" height="3.5" rx=".6" fill={c.blue} /><rect x="15" y="6.5" width="5" height="3.5" rx=".6" fill={c.blue} /><circle cx="6.5" cy="18" r="2.2" fill={c.dark} /><circle cx="17.5" cy="18" r="2.2" fill={c.dark} /></>,
    soft: <><path d="M4 14 V9 C4 6.5 6 6 12 6 S20 6.5 20 9 V14Z" fill={c.teal} /><rect x="3.5" y="12.5" width="17" height="5" rx="2" fill="#14b8a6" /><rect x="1.5" y="10" width="4" height="8" rx="2" fill={c.teal} /><rect x="18.5" y="10" width="4" height="8" rx="2" fill={c.teal} /><rect x="7" y="9.5" width="4.4" height="3.6" rx="1.2" fill="#fcd34d" /><path d="M4.5 17.5 v3 M19.5 17.5 v3" stroke={c.gold} strokeWidth="1.6" strokeLinecap="round" /></>,
  };
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true">{body[name] ?? <circle cx="12" cy="12" r="8" fill={c.light} />}</svg>;
}

/** Xizmat «Joyingizni biz ijaraga beramiz»: naushnikli menejer, qo'lida kalit, yonida "kelishildi" belgisi. */
export function ServiceSticker({ className = "h-10 w-10", uid = "svc" }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b82f6" /><stop offset="1" stopColor="#1e3a8a" /></linearGradient>
        <linearGradient id={`${uid}-k`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fde68a" /><stop offset="1" stopColor="#d97706" /></linearGradient>
      </defs>
      <ellipse cx="30" cy="59" rx="22" ry="3" fill="#0f172a" opacity=".12" />
      {/* tana: kostyum, oq ko'ylak, yashil galstuk */}
      <path d="M10 58 C10 44 18 38 30 38 C42 38 50 44 50 58 Z" fill={`url(#${uid}-s)`} />
      <path d="M24 38.5 L30 47 L36 38.5 Z" fill="#fff" /><path d="M29 41 h2 l1 9 l-2 2.5 l-2 -2.5 z" fill="#16a34a" />
      <path d="M14 50 C16 45 19 43 22 42" stroke="#60a5fa" strokeWidth="1.4" strokeLinecap="round" opacity=".6" fill="none" />
      {/* bosh va soch */}
      <rect x="27" y="31" width="6" height="7" rx="2" fill="#e8b48a" />
      <circle cx="30" cy="24" r="10" fill="#f2c39b" />
      <path d="M20 23 C20 15 25 12.5 30.5 12.5 C36.5 12.5 40.5 16 40 22 C37 19 33 18 27 19.5 C24 20.2 22 21.5 20 23Z" fill="#3f2a1d" />
      <circle cx="26.5" cy="25" r="1.1" fill="#1f2937" /><circle cx="33.5" cy="25" r="1.1" fill="#1f2937" />
      <path d="M27 29 C28.8 30.6 31.2 30.6 33 29" stroke="#b45309" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* naushnik va mikrofon */}
      <path d="M18.5 25 C18.5 15 23.5 10.5 30 10.5 C36.5 10.5 41.5 15 41.5 25" stroke="#1e293b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <rect x="16.5" y="22" width="4.5" height="8" rx="2.2" fill="#1e293b" /><rect x="39" y="22" width="4.5" height="8" rx="2.2" fill="#1e293b" />
      <path d="M19 29.5 C19 33.5 22 35 26 34.5" stroke="#1e293b" strokeWidth="1.6" fill="none" strokeLinecap="round" /><circle cx="26.5" cy="34.4" r="1.5" fill="#16a34a" />
      {/* "kelishildi" pufakchasi */}
      <path d="M45 6 h13 a3 3 0 0 1 3 3 v8 a3 3 0 0 1 -3 3 h-7 l-4 3.5 v-3.5 h-2 a3 3 0 0 1 -3 -3 v-8 a3 3 0 0 1 3 -3z" fill="#16a34a" />
      <path d="M47.5 13 l3 3 l5.5 -6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* qo'lidagi kalit */}
      <g transform="rotate(-30 50 46)"><circle cx="50" cy="40" r="4.5" fill={`url(#${uid}-k)`} /><circle cx="50" cy="40" r="1.8" fill="#1e3a8a" /><rect x="48.8" y="44" width="2.4" height="10" rx="1.2" fill={`url(#${uid}-k)`} /><rect x="51" y="50" width="2.6" height="1.6" rx=".6" fill="#d97706" /></g>
    </svg>
  );
}
