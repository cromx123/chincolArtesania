"use client";

import Link from "next/link";
import { CartIcon } from "../icons";
import { useCart } from "./CartProvider";

export function CartLink({ variant = "header" }: { variant?: "header" | "tab" }) {
  const { count } = useCart();
  const label = count === 1 ? "Carrito, 1 producto" : `Carrito, ${count} productos`;

  if (variant === "tab") {
    return (
      <Link href="/carrito" className="tabbar__item" aria-label={label}>
        <span className="tabbar__icon">
          <CartIcon size={21} />
          {count > 0 && <span className="count-dot">{count}</span>}
        </span>
        Carrito
      </Link>
    );
  }

  return (
    <Link href="/carrito" className="icon-button cart-link" aria-label={label}>
      <CartIcon size={19} />
      <span className="cart-link__count">{count}</span>
    </Link>
  );
}
