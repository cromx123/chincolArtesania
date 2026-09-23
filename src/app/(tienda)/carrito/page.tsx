import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = { title: "Carrito" };

export default function CartPage() {
  return (
    <div className="container cart-page">
      <h1>Tu carrito</h1>
      <CartView />
    </div>
  );
}
