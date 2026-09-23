import { CartProvider } from "@/components/cart/CartProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TabBar } from "@/components/layout/TabBar";

// La tienda lee productos de la base de datos: siempre muestra lo último.
export const dynamic = "force-dynamic";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="store">
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <TabBar />
      </div>
    </CartProvider>
  );
}
