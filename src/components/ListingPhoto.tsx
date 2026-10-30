/* eslint-disable @next/next/no-img-element */
/**
 * E'lon rasmi: har qanday nisbatdagi rasm to'liq (kesilmasdan) ko'rinadi, bo'sh joy
 * shu rasmning xiralashtirilgan nusxasi bilan to'ldiriladi. srcset orqali ekran
 * zichligiga mos o'lcham (thumb 480px yoki asosiy 1600px) tanlanadi — telefonda xira bo'lmaydi.
 */
export default function ListingPhoto({ thumb, full, alt, sizes, className = "", eager = false, children }: {
  thumb: string | null; full?: string | null; alt: string; sizes: string; className?: string; eager?: boolean; children?: React.ReactNode;
}) {
  const src = full ?? thumb;
  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      {src ? <>
        <img src={thumb ?? src} alt="" aria-hidden="true" loading={eager ? "eager" : "lazy"} className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl opacity-70" />
        <img src={src} srcSet={thumb && full && thumb !== full ? `${thumb} 480w, ${full} 1600w` : undefined} sizes={sizes} alt={alt}
          loading={eager ? "eager" : "lazy"} decoding="async" className="relative h-full w-full object-contain" />
      </> : <div className="grid h-full w-full place-items-center p-2 text-center text-sm text-slate-500">{children}</div>}
    </div>
  );
}
