/** Sevimlilar bo'sh: oq fonda bitta yengil xabar (ortiqcha blok va havolalarsiz). */
export default function FavEmpty({ ru }: { ru: boolean }) {
  return (
    <div className="grid min-h-[50vh] place-items-center text-center">
      <div>
        <span aria-hidden="true" className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-slate-50 text-slate-300">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
        </span>
        <p className="mt-4 text-lg font-semibold text-slate-800">{ru ? "Избранное пусто" : "Sevimlilar qo‘shilmagan"}</p>
        <p className="mt-1 text-sm text-slate-500">{ru ? "Нажмите ♡ на объявлении, чтобы сохранить его." : "E’lonni saqlash uchun ♡ belgisini bosing."}</p>
      </div>
    </div>
  );
}
