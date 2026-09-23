"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GridIcon, HomeIcon, WhatsappIcon } from "../icons";
import { CartLink } from "../cart/CartLink";
import { whatsappLink } from "@/config/site";

/** Barra inferior, solo en celular. */
export function TabBar() {
  const pathname = usePathname();
  const current = (href: string) => (pathname === href || (href !== "/" && pathname.startsWith(href)) ? "page" : undefined);

  return (
    <nav className="tabbar" aria-label="Accesos rápidos">
      <Link href="/" className="tabbar__item" aria-current={current("/")}>
        <HomeIcon />
        Inicio
      </Link>
      <Link href="/catalogo" className="tabbar__item" aria-current={current("/catalogo")}>
        <GridIcon />
        Catálogo
      </Link>
      <a href={whatsappLink("Hola, quiero hacer una consulta.")} className="tabbar__item" target="_blank" rel="noopener noreferrer">
        <WhatsappIcon size={21} />
        Consultar
      </a>
      <CartLink variant="tab" />
    </nav>
  );
}
