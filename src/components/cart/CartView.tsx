"use client";

import Link from "next/link";
import type { CartItem } from "@/domain/cart";
import type { LoyaltyPerk } from "@/domain/customer";
import type { PromoRule } from "@/domain/promo";
import { LEATHER_COLORS, THREAD_COLORS } from "@/domain/product";
import { formatPrice } from "@/lib/format";
import { whatsappLink } from "@/config/site";
import { TrashIcon, WhatsappIcon } from "../icons";
import { useCart } from "./CartProvider";
import type { SavedCustomer } from "../customer/saved-customer";
import { useCustomerPerk } from "../customer/useCustomerPerk";
import { PromoBox, usePromo } from "./PromoBox";

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

type AppliedDiscount = { label: string; amount: number };

/** El descuento que se aplica: el mayor entre el código y el de clienta (no se suman). */
function pickDiscount(total: number, promo: PromoRule | null, promoAmount: number, perk: LoyaltyPerk | null): AppliedDiscount | null {
  const perkAmount = perk ? Math.round((total * perk.percent) / 100) : 0;
  if (perkAmount > 0 && perkAmount >= promoAmount) return { label: `Descuento de clienta ${perk!.percent}%`, amount: perkAmount };
  if (promo && promoAmount > 0) return { label: `Código ${promo.code}`, amount: promoAmount };
  return null;
}

/** El pedido se envía por WhatsApp; cuando exista pago en línea, cambia solo este paso. */
function orderMessage(items: CartItem[], total: number, discount: AppliedDiscount | null, customer: SavedCustomer | null): string {
  const lines = items.map((i) => {
    const sel = describeSelection(i);
    return `• ${i.quantity} x ${i.name}${sel ? ` (${sel})` : ""}: ${formatPrice(i.unitPrice * i.quantity)}`;
  });
  const totals = discount
    ? [`Subtotal: ${formatPrice(total)}`, `${discount.label}: −${formatPrice(discount.amount)}`, `Total: ${formatPrice(total - discount.amount)}`]
    : [`Total: ${formatPrice(total)}`];
  const who = customer
    ? ["", "Mis datos:", `• ${customer.name}`, `• ${customer.phone}`, customer.email && `• ${customer.email}`, customer.comuna && `• ${customer.comuna}`].filter(
        (l): l is string => typeof l === "string",
      )
    : [];
  return ["Hola, quiero hacer este pedido:", ...lines, ...totals, ...who].join("\n");
}

export function CartView() {
  const { items, total, ready, setQuantity, remove } = useCart();
  const promo = usePromo(total, ready);
  const { customer, perk } = useCustomerPerk(ready);
  const discount = pickDiscount(total, promo.rule, promo.discount, perk);

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
        <PromoBox total={total} rule={promo.rule} onApply={promo.apply} />
        {perk && (!discount || discount.label.startsWith("Descuento de clienta")) && (
          <p className="cart__perk">
            Tienes {perk.percent}% de descuento {perk.reason}.{promo.rule && promo.discount > 0 ? " Es mayor que el del código, así que usamos este." : ""}
          </p>
        )}
        {discount && (
          <>
            <div className="cart__subline">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="cart__subline cart__subline--discount">
              <span>{discount.label}</span>
              <span>−{formatPrice(discount.amount)}</span>
            </div>
          </>
        )}
        <div className="cart__total">
          <span>Total</span>
          <strong>{formatPrice(total - (discount?.amount ?? 0))}</strong>
        </div>
        {customer ? (
          <p className="cart__who">
            Pedido a nombre de <strong>{customer.name}</strong> ·{" "}
            <Link href="/formulario">cambiar datos</Link>
          </p>
        ) : (
          <p className="cart__who">
            <Link href="/formulario">Déjanos tus datos</Link> y tus próximos pedidos se completan solos, con descuentos para clientas.
          </p>
        )}
        <p className="muted">El despacho o retiro se coordina al confirmar el pedido.</p>
        <a className="btn btn--primary" href={whatsappLink(orderMessage(items, total, discount, customer))} target="_blank" rel="noopener noreferrer">
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
