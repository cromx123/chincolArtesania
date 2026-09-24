import { qrSvg, siteUrl } from "@/server/qr";

/** QR hacia /formulario con el origen marcado, para imprimir en la feria o compartir. */
export async function FormQr({ source, title, hint }: { source: string | null; title: string; hint: string }) {
  const url = `${await siteUrl()}/formulario${source ? `?origen=${encodeURIComponent(source)}` : ""}`;
  const svg = await qrSvg(url);

  return (
    <section className="a-card">
      <h2 className="a-card__title">{title}</h2>
      <div className="a-qr">
        <div className="a-qr__img" role="img" aria-label={`Código QR hacia ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="a-qr__text">
          <p className="a-hint">{hint}</p>
          <code className="a-code a-qr__url">{url}</code>
          <a href={`/admin/qr${source ? `?origen=${encodeURIComponent(source)}` : ""}`} target="_blank" rel="noopener noreferrer" className="a-link">
            Abrir el QR en grande para imprimir
          </a>
        </div>
      </div>
    </section>
  );
}
