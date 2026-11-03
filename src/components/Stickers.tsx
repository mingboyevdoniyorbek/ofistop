/**
 * OfisTop stikerlari: emoji o'rniga o'zimizning rangli SVG rasmlar (bosh sahifa blokchalari, mebel bo'limi).
 * Har birida soya, gradient va yorug'lik aksi bor — barcha qurilmalarda bir xil va aniq ko'rinadi.
 * `uid` — gradient ID'lari sahifada takrorlanmasligi uchun (bir sahifada bir nechta nusxa bo'lsa).
 */
type P = { className?: string; uid?: string };




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


/* ——— 3D stikerlar: yorug'lik chap-yuqoridan, yon tomonlar soyali, ostida yumshoq soya ——— */

function Shadow({ uid, cx = 32, cy = 57, rx = 24, ry = 4.5 }: { uid: string; cx?: number; cy?: number; rx?: number; ry?: number }) {
  return <><defs><radialGradient id={`${uid}-sh`}><stop offset="0" stopColor="#0f172a" stopOpacity=".32" /><stop offset="1" stopColor="#0f172a" stopOpacity="0" /></radialGradient></defs>
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${uid}-sh)`} /></>;
}
function Sparkle({ x, y, r = 2.4, color = "#fff" }: { x: number; y: number; r?: number; color?: string }) {
  return <path d={`M${x} ${y - r}C${x + r * 0.18} ${y - r * 0.18} ${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y}C${x + r * 0.18} ${y + r * 0.18} ${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r}C${x - r * 0.18} ${y + r * 0.18} ${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y}C${x - r * 0.18} ${y - r * 0.18} ${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z`} fill={color} />;
}

/** Biznes markaz: izometrik oynali minora (ikki yon tomon, tom, antenna), orqada kichik bino, yonida daraxt. */
export function CenterSticker({ className = "h-10 w-10", uid = "bc" }: P) {
  const winL: React.ReactNode[] = [], winR: React.ReactNode[] = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) {
    const lit = (r * 7 + c * 3) % 5 === 0;
    const xl = 17.4 + c * 5, yl = 12 + 0.5 * (xl - 16) + 4 + r * 5.6;
    winL.push(<path key={`l${r}${c}`} d={`M${xl} ${yl}l3.4 1.7v3.2l-3.4-1.7z`} fill={lit ? "#fde68a" : "#93c5fd"} opacity={lit ? 1 : 0.55} />);
    const xr = 33.4 + c * 5, yr = 20 - 0.5 * (xr - 32) + 4 + r * 5.6;
    winR.push(<path key={`r${r}${c}`} d={`M${xr} ${yr}l3.4 -1.7v3.2l-3.4 1.7z`} fill={lit ? "#fef3c7" : "#dbeafe"} opacity={lit ? 1 : 0.85} />);
  }
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-l`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1d4ed8" /><stop offset="1" stopColor="#172554" /></linearGradient>
        <linearGradient id={`${uid}-r`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#60a5fa" /><stop offset="1" stopColor="#2563eb" /></linearGradient>
        <linearGradient id={`${uid}-t`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#dbeafe" /><stop offset="1" stopColor="#bfdbfe" /></linearGradient>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5eead4" /><stop offset="1" stopColor="#14b8a6" /></linearGradient>
        <radialGradient id={`${uid}-tr`} cx=".35" cy=".3"><stop offset="0" stopColor="#86efac" /><stop offset="1" stopColor="#16a34a" /></radialGradient>
      </defs>
      <Shadow uid={uid} cy={57} rx={27} ry={5} />
      {/* orqadagi past bino */}
      <path d="M5 34 L13 30 L21 34 L13 38Z" fill="#ccfbf1" />
      <path d="M5 34 V50 L13 54 V38Z" fill="#0f766e" />
      <path d="M13 38 V54 L21 50 V34Z" fill={`url(#${uid}-g)`} />
      {[0, 1, 2].map((r) => <g key={r}><path d={`M6.6 ${38 + r * 4.6}l2.4 1.2v2.4l-2.4-1.2z`} fill="#99f6e4" opacity=".7" /><path d={`M15 ${40.5 + r * 4.6}l2.6-1.3v2.4l-2.6 1.3z`} fill="#f0fdfa" opacity=".9" /></g>)}
      {/* asosiy minora */}
      <path d="M16 12 V50 L32 58 V20Z" fill={`url(#${uid}-l)`} />
      <path d="M32 20 V58 L48 50 V12Z" fill={`url(#${uid}-r)`} />
      <path d="M16 12 L32 4 L48 12 L32 20Z" fill={`url(#${uid}-t)`} />
      <path d="M19 12 L32 5.6 L45 12 L32 18.4Z" fill="#93c5fd" opacity=".55" />
      {winL}{winR}
      <path d="M36 21 L42 18 V50 L36 53Z" fill="#fff" opacity=".13" />
      <path d="M32 20 V58" stroke="#bfdbfe" strokeWidth=".7" opacity=".7" />
      {/* kirish va soyabon */}
      <path d="M22.5 49.5 l5 2.5 v5.2 l-5 -2.5z" fill="#0b1437" />
      <path d="M21.4 48.4 l7.2 3.6 l1 -.5 l-7.2 -3.6z" fill="#e0f2fe" />
      {/* antenna */}
      <path d="M32 12 V2.6" stroke="#1e3a8a" strokeWidth="1.4" strokeLinecap="round" /><circle cx="32" cy="2.6" r="1.5" fill="#f43f5e" /><circle cx="31.6" cy="2.2" r=".5" fill="#fff" />
      {/* daraxt */}
      <rect x="53.2" y="47" width="1.8" height="8" rx=".9" fill="#78350f" />
      <circle cx="54.1" cy="44.5" r="6" fill={`url(#${uid}-tr)`} /><circle cx="51.8" cy="42.4" r="2.2" fill="#bbf7d0" opacity=".55" />
      <Sparkle x={9} y={18} r={2.2} color="#bfdbfe" />
    </svg>
  );
}

/** Sotuv: hajmli oltin kalit (qalinligi va yaltirashi bilan), yashil yorliq — uycha belgisi bilan. */
export function SaleSticker({ className = "h-10 w-10", uid = "sale" }: P) {
  const key = "M15 11.5a10.5 10.5 0 1 1 0 21a10.5 10.5 0 1 1 0-21z";
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff3b0" /><stop offset=".35" stopColor="#fbbf24" /><stop offset=".8" stopColor="#d97706" /><stop offset="1" stopColor="#b45309" /></linearGradient>
        <linearGradient id={`${uid}-d`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b45309" /><stop offset="1" stopColor="#78350f" /></linearGradient>
        <linearGradient id={`${uid}-t`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6ee7b7" /><stop offset=".5" stopColor="#10b981" /><stop offset="1" stopColor="#047857" /></linearGradient>
      </defs>
      <Shadow uid={uid} cy={57.5} rx={25} ry={4.5} />
      {/* bog'ich ip */}
      <path d="M22 16 C30 6 40 6 44 15" fill="none" stroke="#475569" strokeWidth="1.3" strokeLinecap="round" />
      {/* yorliq: qalinlik (pastki qatlam) + yuz */}
      <g transform="rotate(14 48 26)">
        <path d="M40.5 15.5 h14 a3.5 3.5 0 0 1 3.5 3.5 v15 a3.5 3.5 0 0 1 -3.5 3.5 h-14 a3.5 3.5 0 0 1 -3.5 -3.5 v-11.5 z" fill="#065f46" transform="translate(1.2 1.6)" />
        <path d="M40.5 15.5 h14 a3.5 3.5 0 0 1 3.5 3.5 v15 a3.5 3.5 0 0 1 -3.5 3.5 h-14 a3.5 3.5 0 0 1 -3.5 -3.5 v-11.5 z" fill={`url(#${uid}-t)`} />
        <path d="M40 17.5 h14" stroke="#d1fae5" strokeWidth="1.1" strokeLinecap="round" opacity=".7" />
        <circle cx="42" cy="20" r="1.7" fill="#ecfdf5" /><circle cx="42" cy="20" r=".8" fill="#047857" />
        <path d="M43 30.5 l4.5 -4 l4.5 4 v4.2 h-9z" fill="#fff" /><rect x="46.4" y="31.4" width="2.2" height="3.3" rx=".4" fill="#059669" />
      </g>
      {/* kalit: qalinlik (ekstruziya) */}
      <g transform="translate(1.3 1.8)" fill={`url(#${uid}-d)`}>
        <path d={key} /><path d="M23.6 27.3 l25.5 15 a2.6 2.6 0 0 1 -2.6 4.5 l-25.5 -15z" /><path d="M41.4 43.8 L44 45.3 L42.2 48.4 L39.6 46.8Z M36.8 41.1 L39.4 42.6 L38.1 44.9 L35.5 43.3Z" />
      </g>
      {/* kalit: yuz */}
      <path d={key} fill={`url(#${uid}-g)`} />
      <circle cx="15" cy="22" r="4.4" fill="#fff" /><circle cx="15" cy="22" r="4.4" fill="none" stroke="#b45309" strokeWidth="1" />
      <path d="M23.6 27.3 l25.5 15 a2.6 2.6 0 0 1 -2.6 4.5 l-25.5 -15z" fill={`url(#${uid}-g)`} />
      <path d="M41.4 43.8 L44 45.3 L42.2 48.4 L39.6 46.8Z M36.8 41.1 L39.4 42.6 L38.1 44.9 L35.5 43.3Z" fill="#f59e0b" />
      {/* yaltirash */}
      <path d="M8.5 18.5 A8 8 0 0 1 16 12.8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity=".85" />
      <path d="M26 28.2 L44.5 39" stroke="#fff7d6" strokeWidth="1.2" strokeLinecap="round" opacity=".8" />
      <Sparkle x={8} y={39} r={2.6} color="#fde68a" /><Sparkle x={57} y={47} r={2} color="#fde68a" /><Sparkle x={30} y={9} r={1.6} color="#a7f3d0" />
    </svg>
  );
}

/** Mebel: hashamatli Chesterfield divan — baxmal, chuqur tugmachalar, o'ralgan qo'ltiqlar, yostiqlar va oltin oyoqlar. */
export function SofaSticker({ className = "h-10 w-10", uid = "sofa" }: P) {
  const tufts: [number, number][] = [];
  for (const y of [21, 28]) for (let x = 17; x <= 47; x += 7.5) tufts.push([x + (y === 28 ? 3.75 : 0), y]);
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-b`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34d399" /><stop offset=".35" stopColor="#0d9488" /><stop offset="1" stopColor="#115e59" /></linearGradient>
        <linearGradient id={`${uid}-s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2dd4bf" /><stop offset=".5" stopColor="#0f766e" /><stop offset="1" stopColor="#134e4a" /></linearGradient>
        <linearGradient id={`${uid}-f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0f766e" /><stop offset="1" stopColor="#042f2e" /></linearGradient>
        <radialGradient id={`${uid}-a`} cx=".4" cy=".35" r=".7"><stop offset="0" stopColor="#5eead4" /><stop offset=".6" stopColor="#0f766e" /><stop offset="1" stopColor="#134e4a" /></radialGradient>
        <linearGradient id={`${uid}-p`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fffbeb" /><stop offset=".6" stopColor="#fde68a" /><stop offset="1" stopColor="#f59e0b" /></linearGradient>
        <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fde68a" /><stop offset="1" stopColor="#b45309" /></linearGradient>
      </defs>
      <Shadow uid={uid} cy={56.5} rx={28} ry={4.2} />
      {/* suyanchiq */}
      <path d="M10 37 V20 C10 13.5 15 11.5 32 11.5 C49 11.5 54 13.5 54 20 V37 Z" fill={`url(#${uid}-b)`} />
      <path d="M13 15.5 C20 13.2 44 13.2 51 15.5" stroke="#a7f3d0" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".7" />
      {/* olmos chiziqlar (capitonné) */}
      <path d="M13.5 24.5 L17 21 L20.75 24.5 L24.5 21 L28.25 24.5 L32 21 L35.75 24.5 L39.5 21 L43.25 24.5 L47 21 L50.5 24.5 M17 31.5 L20.75 28 L24.5 31.5 L28.25 28 L32 31.5 L35.75 28 L39.5 31.5 L43.25 28 L47 31.5" fill="none" stroke="#064e3b" strokeWidth=".7" opacity=".45" />
      {tufts.map(([x, y]) => <g key={`${x}-${y}`}><circle cx={x} cy={y} r="1.35" fill="#064e3b" opacity=".75" /><circle cx={x - .4} cy={y - .45} r=".5" fill="#99f6e4" /></g>)}
      {/* o'rindiq: ustki yuza va old qalinligi */}
      <path d="M9 37 C9 34.5 11 33.5 14 33.5 H50 C53 33.5 55 34.5 55 37 V39 H9Z" fill={`url(#${uid}-s)`} />
      <path d="M32 33.8 V39" stroke="#064e3b" strokeWidth=".8" opacity=".45" />
      <path d="M12 35.4 H52" stroke="#5eead4" strokeWidth="1" strokeLinecap="round" opacity=".55" />
      <path d="M9 39 H55 V45.5 C55 47 54 48 52.5 48 H11.5 C10 48 9 47 9 45.5Z" fill={`url(#${uid}-f)`} />
      <path d="M11 40.5 H53" stroke="#2dd4bf" strokeWidth=".7" opacity=".4" />
      {/* qo'ltiqlar: o'ralgan, old yuzida spiral */}
      {[[2.5, 13.5], [50.5, 61.5]].map(([x1, x2], i) => <g key={i}>
        <rect x={x1} y="25" width={x2 - x1} height="23.5" rx="5.5" fill={`url(#${uid}-a)`} />
        <ellipse cx={(x1 + x2) / 2} cy="28.6" rx="5.2" ry="3.6" fill="#14b8a6" />
        <path d={`M${(x1 + x2) / 2 - 2.6} 28.6 a2.6 2 0 1 1 2.6 2 a1.4 1.1 0 1 1 1.3 -1.1`} fill="none" stroke="#042f2e" strokeWidth=".7" opacity=".5" />
        <path d={`M${x1 + 1.6} 33 V45`} stroke="#5eead4" strokeWidth="1" strokeLinecap="round" opacity=".45" />
      </g>)}
      {/* yostiqlar (chetlari bilan) */}
      <g transform="rotate(-11 21 30)"><rect x="14.5" y="24.5" width="13" height="10" rx="3.2" fill={`url(#${uid}-p)`} /><rect x="14.5" y="24.5" width="13" height="10" rx="3.2" fill="none" stroke="#d97706" strokeWidth=".8" /><path d="M17 29.5 h8" stroke="#d97706" strokeWidth=".7" strokeDasharray="1 1" /></g>
      <g transform="rotate(11 43 30)"><rect x="36.5" y="24.5" width="13" height="10" rx="3.2" fill={`url(#${uid}-p)`} /><rect x="36.5" y="24.5" width="13" height="10" rx="3.2" fill="none" stroke="#d97706" strokeWidth=".8" /><path d="M39 29.5 h8" stroke="#d97706" strokeWidth=".7" strokeDasharray="1 1" /></g>
      {/* oltin burama oyoqlar */}
      {[11.5, 49.5].map((x) => <g key={x}><path d={`M${x} 48 h3 l-.5 2.2 l.6 1 l-.9 3.3 h-1.4 l-.9 -3.3 l.6 -1z`} fill={`url(#${uid}-gold)`} /><circle cx={x + 1.5} cy="55" r=".9" fill="#fde68a" /></g>)}
      <Sparkle x={57} y={14} r={2.4} color="#fde68a" /><Sparkle x={6} y={19} r={1.7} color="#a7f3d0" />
    </svg>
  );
}

/** Xizmat «Biz ijaraga beramiz»: qo'ng'iroqlarni qabul qilayotgan smartfon (ekranda uy va yashil qo'ng'iroq), atrofida xabar pufakchalari va "kelishildi" belgisi. */
export function ServiceSticker({ className = "h-10 w-10", uid = "svc" }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-c`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#475569" /><stop offset="1" stopColor="#0f172a" /></linearGradient>
        <linearGradient id={`${uid}-s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dbeafe" /><stop offset="1" stopColor="#93c5fd" /></linearGradient>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4ade80" /><stop offset="1" stopColor="#15803d" /></linearGradient>
        <linearGradient id={`${uid}-b`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#60a5fa" /><stop offset="1" stopColor="#1d4ed8" /></linearGradient>
      </defs>
      <Shadow uid={uid} cx={30} cy={58} rx={22} ry={4} />
      {/* telefon: qalinlik + korpus + ekran */}
      <g transform="rotate(-8 30 32)">
        <rect x="18.6" y="6.6" width="24" height="46" rx="5.5" fill="#020617" transform="translate(1.6 1.4)" />
        <rect x="18" y="6" width="24" height="46" rx="5.5" fill={`url(#${uid}-c)`} />
        <rect x="20.2" y="9.5" width="19.6" height="38.5" rx="3.4" fill={`url(#${uid}-s)`} />
        <rect x="27" y="7.4" width="6" height="1.3" rx=".65" fill="#1e293b" />
        {/* ekran: uy kartasi */}
        <rect x="22" y="12" width="16" height="13" rx="2.2" fill="#fff" />
        <path d="M25.5 21.5 v-4 l4.5 -3.6 l4.5 3.6 v4z" fill="#2563eb" /><rect x="28.9" y="18.6" width="2.2" height="2.9" rx=".4" fill="#fde68a" />
        <rect x="22" y="27" width="11" height="2" rx="1" fill="#fff" opacity=".9" /><rect x="22" y="31" width="8" height="2" rx="1" fill="#fff" opacity=".7" />
        {/* qo'ng'iroq tugmasi */}
        <circle cx="30" cy="41.5" r="4.4" fill={`url(#${uid}-g)`} />
        <path d="M27.9 39.8 c.4 1.9 1.6 3.2 3.4 3.8 l.9 -.9 c.2 -.2 .5 -.2 .7 -.1 l1 .5 c.3 .1 .4 .5 .2 .8 l-.6 .8 c-.4 .5 -1 .6 -1.6 .4 c-2.4 -.9 -4 -2.6 -4.7 -5 c-.2 -.6 0 -1.2 .5 -1.5 l.8 -.6 c.3 -.2 .7 -.1 .8 .2 l.4 1 c.1 .3 0 .6 -.2 .7z" fill="#fff" />
        <circle cx="30" cy="41.5" r="6.6" fill="none" stroke="#22c55e" strokeWidth="1" opacity=".5" />
        <path d="M19.5 9 C19.5 7.5 20.5 7 22 7" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" opacity=".7" />
      </g>
      {/* xabar pufakchalari */}
      <g><path d="M3.5 18 h12 a3 3 0 0 1 3 3 v6 a3 3 0 0 1 -3 3 h-6 l-3.5 3 v-3 h-2.5 a3 3 0 0 1 -3 -3 v-6 a3 3 0 0 1 3 -3z" fill={`url(#${uid}-b)`} />
        <circle cx="6.8" cy="24" r="1.2" fill="#fff" /><circle cx="10.3" cy="24" r="1.2" fill="#fff" /><circle cx="13.8" cy="24" r="1.2" fill="#fff" /></g>
      {/* "kelishildi" belgisi */}
      <circle cx="51.5" cy="36" r="8.5" fill="#14532d" transform="translate(1 1.2)" />
      <circle cx="51.5" cy="36" r="8.5" fill={`url(#${uid}-g)`} />
      <path d="M47.3 36.2 l2.9 2.9 l5.6 -6" stroke="#fff" strokeWidth="2.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M45.5 32.5 A6.5 6.5 0 0 1 50 29" stroke="#bbf7d0" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity=".8" />
      <Sparkle x={53} y={11} r={2.4} color="#fde68a" /><Sparkle x={8} y={46} r={1.8} color="#bfdbfe" />
    </svg>
  );
}
