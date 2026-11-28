/* eslint-disable @next/next/no-img-element */
/** Mebel firmasining logotipi; yuklanmagan bo'lsa — nomining bosh harflari. */
export default function FirmAvatar({ name, url, size = "h-12 w-12 text-lg" }: { name: string; url: string | null; size?: string }) {
  return url
    ? <img src={url} alt="" loading="lazy" decoding="async" className={`${size} shrink-0 rounded-xl bg-white object-cover ring-1 ring-slate-200`} />
    : <span aria-hidden="true" className={`grid ${size} shrink-0 place-items-center rounded-xl bg-blue-50 font-bold text-brand`}>{name.slice(0, 2).toUpperCase()}</span>;
}
