"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BoxIcon, CalculatorIcon, CalendarIcon, CartIcon, ChatIcon, GridIcon, NewspaperIcon, PercentIcon, PlusIcon, TagIcon, UsersIcon } from "../icons";

const LINKS = [
  { href: "/admin", label: "Inicio", icon: GridIcon },
  { href: "/admin/ventas", label: "Ventas", icon: TagIcon },
  { href: "/admin/productos", label: "Productos", icon: CartIcon },
  { href: "/admin/materiales", label: "Materiales", icon: BoxIcon },
  { href: "/admin/calculadora", label: "Calcular precio", icon: CalculatorIcon },
  { href: "/admin/cotizaciones", label: "Cotizaciones", icon: ChatIcon },
  { href: "/admin/calendario", label: "Calendario", icon: CalendarIcon },
  { href: "/admin/promociones", label: "Promociones", icon: PercentIcon },
  { href: "/admin/clientas", label: "Clientas", icon: UsersIcon },
  { href: "/admin/newsletter", label: "Newsletter", icon: NewspaperIcon },
  { href: "/admin/asistencia", label: "Asistencia", icon: ChatIcon },
];

/** Números de aviso por sección, ej: { "/admin/cotizaciones": 3 }. */
export type NavBadges = Partial<Record<string, number>>;

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/ventas") return pathname === "/admin/ventas" || /^\/admin\/ventas\/(?!nueva)/.test(pathname);
  return pathname.startsWith(href);
}

function Badge({ count, label }: { count: number | undefined; label: string }) {
  if (!count) return null;
  return (
    <span className="a-badge" aria-label={`${count} ${label}`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** Menú lateral (computador). */
export function AdminSidebarNav({ badges = {} }: { badges?: NavBadges }) {
  const pathname = usePathname();
  return (
    <nav className="a-side__nav" aria-label="Administrador">
      <Link href="/admin/ventas/nueva" className="a-side__cta">
        <PlusIcon /> Registrar venta
      </Link>
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="a-side__link" aria-current={isActive(pathname, href) ? "page" : undefined}>
          <Icon size={19} />
          {label}
          <Badge count={badges[href]} label="nuevas" />
        </Link>
      ))}
    </nav>
  );
}

/**
 * Barra inferior (celular) con "Vender" al centro, que es lo que más se usa.
 * Cotizaciones no cabe en la barra: su aviso se muestra en "Inicio", que las lista en "Para revisar".
 */
export function AdminTabBar({ badges = {} }: { badges?: NavBadges }) {
  const pathname = usePathname();
  const tab = (i: number, badge?: number) => {
    const { href, label, icon: Icon } = LINKS[i];
    return (
      <Link href={href} className="a-tab" aria-current={isActive(pathname, href) ? "page" : undefined}>
        <span className="a-tab__icon">
          <Icon size={21} />
          <Badge count={badge} label="cotizaciones nuevas" />
        </span>
        {label}
      </Link>
    );
  };
  return (
    <nav className="a-tabbar" aria-label="Administrador">
      {tab(0, badges["/admin/cotizaciones"])}
      {tab(1)}
      <Link href="/admin/ventas/nueva" className="a-tab a-tab--sell" aria-current={pathname === "/admin/ventas/nueva" ? "page" : undefined}>
        <span className="a-tab__plus">
          <PlusIcon size={24} />
        </span>
        Vender
      </Link>
      {tab(2)}
      {tab(3)}
    </nav>
  );
}
