"use client";

import { useState } from "react";
import { LEATHER_COLORS, type LeatherColorId, type Product, THREAD_COLORS, type ThreadColorId, isPurchasable } from "@/domain/product";
import { formatPrice } from "@/lib/format";
import { whatsappLink } from "@/config/site";
import { useCart } from "../cart/CartProvider";
import { WhatsappIcon } from "../icons";

/** Opciones (cuero, hilo, grabado), cantidad y botones de compra. */
export function ProductPurchase({ product }: { product: Product }) {
  const { add } = useCart();
  const leathers = LEATHER_COLORS.filter((c) => product.options.leatherColors.includes(c.id));
  const threads = THREAD_COLORS.filter((c) => product.options.threadColors.includes(c.id));

  const [leather, setLeather] = useState<LeatherColorId | undefined>(leathers[0]?.id);
  const [thread, setThread] = useState<ThreadColorId | undefined>(threads[0]?.id);
  const [initials, setInitials] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const purchasable = isPurchasable(product);
  // Con stock se limita a lo disponible; sobre pedido no hay tope.
  const maxQuantity = product.stock > 0 ? product.stock : 10;

  const selectionText = [
    leather && `cuero ${LEATHER_COLORS.find((c) => c.id === leather)!.name.toLowerCase()}`,
    thread && `hilo ${THREAD_COLORS.find((c) => c.id === thread)!.name.toLowerCase()}`,
    initials && `iniciales ${initials.toUpperCase()}`,
  ]
    .filter(Boolean)
    .join(", ");

  function handleAdd() {
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      unitPrice: product.price,
      quantity,
      selection: { leatherColor: leather, threadColor: thread, initials: initials.trim().toUpperCase() || undefined },
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  }

  return (
    <div className="purchase">
      {leathers.length > 0 && (
        <fieldset className="option">
          <legend className="eyebrow">
            Color del cuero · <span className="option__value">{LEATHER_COLORS.find((c) => c.id === leather)?.name}</span>
          </legend>
          <div className="swatches">
            {leathers.map((c) => (
              <button
                key={c.id}
                type="button"
                className="swatch"
                style={{ background: c.hex }}
                aria-label={`Cuero ${c.name.toLowerCase()}`}
                aria-pressed={leather === c.id}
                onClick={() => setLeather(c.id)}
              />
            ))}
          </div>
        </fieldset>
      )}

      {threads.length > 0 && (
        <fieldset className="option">
          <legend className="eyebrow">Color del hilo</legend>
          <div className="pills">
            {threads.map((c) => (
              <button key={c.id} type="button" className="pill" aria-pressed={thread === c.id} onClick={() => setThread(c.id)}>
                {c.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {product.options.engraving && (
        <div className="option">
          <label htmlFor="iniciales" className="eyebrow">
            Grabado de iniciales (opcional)
          </label>
          <input
            id="iniciales"
            className="input input--short"
            type="text"
            maxLength={3}
            placeholder="Hasta 3 letras"
            value={initials}
            onChange={(e) => setInitials(e.target.value.replace(/[^a-zA-ZñÑ]/g, ""))}
          />
        </div>
      )}

      <div className="purchase__bar">
        <div className="purchase__price-mobile">{formatPrice(product.price)}</div>
        <div className="purchase__actions">
          {purchasable && (
            <div className="stepper" aria-label="Cantidad">
              <button type="button" aria-label="Quitar una unidad" disabled={quantity <= 1} onClick={() => setQuantity((q) => q - 1)}>
                −
              </button>
              <output aria-live="polite">{quantity}</output>
              <button type="button" aria-label="Agregar una unidad" disabled={quantity >= maxQuantity} onClick={() => setQuantity((q) => q + 1)}>
                +
              </button>
            </div>
          )}
          <button type="button" className="btn btn--primary btn--grow" disabled={!purchasable} onClick={handleAdd}>
            {!purchasable ? "Agotado" : added ? "Agregado al carrito" : "Agregar al carrito"}
          </button>
        </div>
        <a
          className="btn btn--outline"
          href={whatsappLink(`Hola, quiero consultar por ${product.name}${selectionText ? ` (${selectionText})` : ""}.`)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <WhatsappIcon size={19} />
          Consultar por WhatsApp
        </a>
      </div>
    </div>
  );
}
