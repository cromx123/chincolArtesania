"use client";

import Link from "next/link";
import type { CartItem } from "@/domain/cart";
import { LEATHER_COLORS, THREAD_COLORS } from "@/domain/product";
import { formatPrice } from "@/lib/format";
import { whatsappLink } from "@/config/site";
import { TrashIcon, WhatsappIcon } from "../icons";
import { useCart } from "./CartProvider";

function describeSelection(item: CartItem): string {
  const s = item.selection;
  return [
    s.leatherColor && `Cuero ${LEATHER_COLORS.find((c) => c.id === s.leatherColor)?.name.toLowerCase()}`,
    s.threadColor && `hilo ${THREAD_COLORS.find((c) => c.id === s.threadColor)?.name.toLowerCase()}`,
    s.initials && `iniciales ${s.initials}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** El pedido se envía por WhatsApp; cuando exista pago en línea, cambia solo este paso. */
function orderMessage(items: CartItem[], total: number): string {
  const lines = items.map((i) => {
    const sel = describeSelection(i);
    return `• ${i.quantity} x ${i.name}${sel ? ` (${sel})` : ""}: ${formatPrice(i.unitPrice * i.quantity)}`;
  });
  return ["Hola, quiero hacer este pedido:", ...lines, `Total: ${formatPrice(total)}`].join("\n");
}

export function CartView() {
  const { items, total, ready, setQuantity, remove } = useCart();

  if (!ready) return <p className="muted">Cargando…</p>;

  if (items.length === 0) {
    return (
      <div className="empty">
        <h2>Tu carrito está vacío</h2>
        <p className="muted">Revisa las piezas del taller y agrega las que te gusten.</p>
        <Link href="/catalogo" className="btn btn--primary">
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="cart">
      <ul className="cart__list">
        {items.map((item) => (
          <li key={item.key} className="cart-line">
            <div className="cart-line__info">
              <Link href={`/catalogo/${item.slug}`} className="product-card__name">
                {item.name}
              </Link>
              {describeSelection(item) && <span className="muted">{describeSelection(item)}</span>}
              <span className="cart-line__unit muted">{formatPrice(item.unitPrice)} c/u</span>
            </div>
            <div className="stepper stepper--sm" aria-label={`Cantidad de ${item.name}`}>
              <button type="button" aria-label="Quitar una unidad" onClick={() => setQuantity(item.key, item.quantity - 1)}>
                −
              </button>
              <output>{item.quantity}</output>
              <button type="button" aria-label="Agregar una unidad" onClick={() => setQuantity(item.key, item.quantity + 1)}>
                +
              </button>
            </div>
            <strong className="cart-line__total">{formatPrice(item.unitPrice * item.quantity)}</strong>
            <button type="button" className="icon-button icon-button--bare" aria-label={`Quitar ${item.name}`} onClick={() => remove(item.key)}>
              <TrashIcon />
            </button>
          </li>
        ))}
      </ul>

      <aside className="cart__summary">
        <div className="cart__total">
          <span>Total</span>
          <strong>{formatPrice(total)}</strong>
        </div>
        <p className="muted">El despacho o retiro se coordina al confirmar el pedido.</p>
        <a className="btn btn--primary" href={whatsappLink(orderMessage(items, total))} target="_blank" rel="noopener noreferrer">
          <WhatsappIcon size={19} />
          Enviar pedido por WhatsApp
        </a>
        <Link href="/catalogo" className="btn btn--ghost">
          Seguir mirando
        </Link>
      </aside>
    </div>
  );
}
