import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";
import { PageAnimals } from "@/components/PageAnimals";

export const metadata: Metadata = { title: "Carrito" };

export default function CartPage() {
  return (
    <div className="has-animals">
      <PageAnimals section="carrito" />
      <div className="container cart-page">
        <h1>Tu carrito</h1>
        <CartView />
      </div>
    </div>
  );
}
