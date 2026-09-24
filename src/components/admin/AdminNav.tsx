"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BoxIcon, CalculatorIcon, CalendarIcon, CartIcon, ChatIcon, GridIcon, PercentIcon, PlusIcon, TagIcon, UsersIcon } from "../icons";

const LINKS = [
  { href: "/admin", label: "Inicio", icon: GridIcon },
  { href: "/admin/ventas", label: "Ventas", icon: TagIcon },
  { href: "/admin/productos", label: "Productos", icon: CartIcon },
  { href: "/admin/materiales", label: "Materiales", icon: BoxIcon },
  { href: "/admin/calculadora", label: "Calcular precio", icon: CalculatorIcon },
  { href: "/admin/calendario", label: "Calendario", icon: CalendarIcon },
  { href: "/admin/promociones", label: "Promociones", icon: PercentIcon },
  { href: "/admin/clientas", label: "Clientas", icon: UsersIcon },
  { href: "/admin/asistencia", label: "Asistencia", icon: ChatIcon },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/ventas") return pathname === "/admin/ventas" || /^\/admin\/ventas\/(?!nueva)/.test(pathname);
  return pathname.startsWith(href);
}

/** Menú lateral (computador). */
export function AdminSidebarNav() {
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
        </Link>
      ))}
    </nav>
  );
}

/** Barra inferior (celular) con "Vender" al centro, que es lo que más se usa. */
export function AdminTabBar() {
  const pathname = usePathname();
  const tab = (i: number) => {
    const { href, label, icon: Icon } = LINKS[i];
    return (
      <Link href={href} className="a-tab" aria-current={isActive(pathname, href) ? "page" : undefined}>
        <Icon size={21} />
        {label}
      </Link>
    );
  };
  return (
    <nav className="a-tabbar" aria-label="Administrador">
      {tab(0)}
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
