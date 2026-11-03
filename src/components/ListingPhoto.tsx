/* eslint-disable @next/next/no-img-element */
/**
 * E'lon rasmi. fit="cover" (kartochkalar): rasm ramkani to'liq egallaydi, chetlari kesiladi — yonida bo'sh joy qolmaydi.
 * fit="contain" (galereya): rasm to'liq (kesilmasdan) ko'rinadi, bo'sh joy xiralashtirilgan nusxa bilan to'ldiriladi. srcset orqali ekran
 * zichligiga mos o'lcham (thumb 480px, o'rta 800px yoki asosiy 1600px) tanlanadi — telefonda xira bo'lmaydi.
 */
export default function ListingPhoto({ thumb, medium, full, alt, sizes, className = "", eager = false, fit = "contain", children }: {
  thumb: string | null; medium?: string | null; full?: string | null; alt: string; sizes: string; className?: string; eager?: boolean; fit?: "cover" | "contain"; children?: React.ReactNode;
}) {
  const src = full ?? thumb;
  const srcSet = thumb && full && thumb !== full ? [`${thumb} 480w`, ...(medium ? [`${medium} 800w`] : []), `${full} 1600w`].join(", ") : undefined;
  if (fit === "cover") return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      {src ? <img src={src} srcSet={srcSet} sizes={sizes} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover" />
        : <div className="grid h-full w-full place-items-center p-2 text-center text-sm text-slate-500">{children}</div>}
    </div>
  );
  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      {src ? <>
        <img src={thumb ?? src} alt="" aria-hidden="true" loading={eager ? "eager" : "lazy"} className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl opacity-70" />
        <img src={src} srcSet={srcSet} sizes={sizes} alt={alt}
          loading={eager ? "eager" : "lazy"} decoding="async" className="relative h-full w-full object-contain" />
      </> : <div className="grid h-full w-full place-items-center p-2 text-center text-sm text-slate-500">{children}</div>}
    </div>
  );
}
