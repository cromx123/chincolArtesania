import Link from "next/link";
import { instagramUrl, site, whatsappLink } from "@/config/site";
import { ChincolBird } from "../icons";
import { NewsletterForm } from "./NewsletterForm";

export function SiteFooter() {
  const ig = instagramUrl();
  return (
    <footer id="contacto" className="site-footer">
      <div className="container site-footer__inner">
        <div className="site-footer__brand">
          <span className="site-footer__logo">
            <ChincolBird size={26} strokeWidth={2.6} />
            {site.fullName}
          </span>
          <p>{site.tagline}</p>
          <NewsletterForm />
        </div>
        <div className="site-footer__cols">
          <div>
            <h2 className="footer-title">Tienda</h2>
            <Link href="/catalogo">Catálogo</Link>
            <Link href="/catalogo?tipo=personalizable">Personalizados</Link>
            <Link href="/catalogo?tipo=encargo">Por encargo</Link>
          </div>
          <div>
            <h2 className="footer-title">Contacto</h2>
            <a href={whatsappLink("Hola, quiero hacer una consulta.")} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
            {ig && (
              <a href={ig} target="_blank" rel="noopener noreferrer">
                {site.instagram}
              </a>
            )}
            {site.email && <span>{site.email}</span>}
          </div>
          {(site.address || site.hours) && (
            <div>
              <h2 className="footer-title">Taller</h2>
              {site.address && <span>{site.address}</span>}
              {site.hours && <span>{site.hours}</span>}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
