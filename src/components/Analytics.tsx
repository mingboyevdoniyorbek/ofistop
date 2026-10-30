import Script from "next/script";

/** Google Analytics 4 va Yandex Metrika — faqat ID sozlangan bo'lsa yuklanadi. */
export default function Analytics() {
  const ga = process.env.NEXT_PUBLIC_GA_ID?.trim();
  const ym = process.env.NEXT_PUBLIC_YM_ID?.trim();
  const gaOk = ga && /^G-[A-Z0-9]+$/.test(ga), ymOk = ym && /^\d+$/.test(ym);
  return <>
    {gaOk && <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
      <Script id="ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga}');`}</Script>
    </>}
    {ymOk && <Script id="ym" strategy="afterInteractive">{`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${ym},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true});`}</Script>}
  </>;
}
