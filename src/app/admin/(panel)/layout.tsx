import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { requireAdmin } from "@/server/require-admin";
import { AdminSidebarNav, AdminTabBar } from "@/components/admin/AdminNav";
import { ChincolBird, LogoutIcon, StoreIcon } from "@/components/icons";
import { logoutAction } from "../_actions/auth";
import "../admin.css";

export const metadata: Metadata = { title: { default: "Administrador", template: "%s · Administrador" }, robots: { index: false } };

function Brand() {
  return (
    <Link href="/admin" className="a-brand">
      <span className="a-brand__seal">
        <ChincolBird size={20} />
      </span>
      <span className="a-brand__text">
        <span className="a-brand__name">{site.name}</span>
        <span className="a-brand__sub">Administrador</span>
      </span>
    </Link>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="a-app">
      <aside className="a-side">
        <Brand />
        <AdminSidebarNav />
        <div className="a-side__foot">
          <Link href="/" className="a-side__link" target="_blank">
            <StoreIcon size={19} /> Ver mi tienda
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="a-side__link">
              <LogoutIcon size={19} /> Salir
            </button>
          </form>
        </div>
      </aside>

      <header className="a-topbar">
        <Brand />
        <div className="a-topbar__actions">
          <Link href="/" className="a-icon-btn a-icon-btn--dark" aria-label="Ver mi tienda" target="_blank">
            <StoreIcon />
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="a-icon-btn a-icon-btn--dark" aria-label="Salir">
              <LogoutIcon />
            </button>
          </form>
        </div>
      </header>

      <main className="a-main">{children}</main>
      <AdminTabBar />
    </div>
  );
}
