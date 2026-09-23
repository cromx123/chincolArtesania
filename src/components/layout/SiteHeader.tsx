import Link from "next/link";
import { site } from "@/config/site";
import { BirdsOrnament, ChincolBird, SearchIcon } from "../icons";
import { CartLink } from "../cart/CartLink";
import { MobileMenu } from "./MobileMenu";

export const NAV_LINKS = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/catalogo?tipo=personalizable", label: "Personalizados" },
  { href: "/#taller", label: "El taller" },
  { href: "#contacto", label: "Contacto" },
];

export function AnnouncementBar() {
  return (
    <div className="announcement">
      <span>Hecho a mano en el taller</span>
      <BirdsOrnament className="announcement__bird" />
      <span>Pedidos personalizados por encargo</span>
      <BirdsOrnament className="announcement__bird" />
      <span>Despacho y retiro a coordinar</span>
    </div>
  );
}

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label={`${site.fullName}, inicio`}>
      <span className="logo__seal">
        <ChincolBird size={23} />
      </span>
      <span className="logo__text">
        <span className="logo__name">{site.name}</span>
        <span className="logo__sub">Artesanías</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <>
      <AnnouncementBar />
      <header className="site-header">
        <div className="container site-header__inner">
          <MobileMenu links={NAV_LINKS} />
          <Logo />
          <nav className="site-nav" aria-label="Principal">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="site-header__actions">
            <Link href="/catalogo#buscar" className="icon-button search-link" aria-label="Buscar en el catálogo">
              <SearchIcon size={19} />
            </Link>
            <CartLink />
          </div>
        </div>
      </header>
    </>
  );
}
