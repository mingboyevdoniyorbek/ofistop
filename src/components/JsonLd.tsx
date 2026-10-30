/** JSON-LD tuzilgan ma'lumot. "<" belgisi qochiriladi — foydalanuvchi matni skriptni yopa olmaydi. */
export default function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
