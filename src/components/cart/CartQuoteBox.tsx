"use client";

import { useState, useTransition } from "react";
import type { CartItem } from "@/domain/cart";
import { formatPrice } from "@/lib/format";
import { requestCartQuoteAction } from "@/app/(tienda)/_actions/quote";
import type { SavedCustomer } from "../customer/saved-customer";

/**
 * "Generar cotización": deja el pedido del carrito como cotización para la artesana, igual
 * que las del chat. Si la clienta ya guardó sus datos en este dispositivo, no se los pide.
 */
export function CartQuoteBox({ items, promoCode, customer, total }: { items: CartItem[]; promoCode: string | null; customer: SavedCustomer | null; total: number }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<number | null>(null);
  const [pending, start] = useTransition();

  function send() {
    setError(null);
    start(async () => {
      const result = await requestCartQuoteAction({
        lines: items.map((i) => ({ productId: i.productId, quantity: i.quantity, selection: i.selection })),
        promoCode,
        customerToken: customer?.token ?? null,
        contact: { name, phone, email },
        note,
      });
      if (result.ok) setSent(result.total);
      else setError(result.error);
    });
  }

  if (sent !== null) {
    return (
      <div className="cart-quote cart-quote--sent" role="status">
        <strong>¡Listo! Recibimos tu cotización por {formatPrice(sent)}.</strong>
        <span>La artesana la revisa y te contacta para confirmar el pedido y el despacho.</span>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn btn--outline" onClick={() => setOpen(true)}>
        Generar cotización
      </button>
    );
  }

  return (
    <form
      className="cart-quote"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      noValidate
    >
      <strong className="cart-quote__title">Generar cotización</strong>
      <p className="muted">Te la enviamos por {formatPrice(total)} y la artesana te contacta para confirmar. No se cobra nada ahora.</p>
      {customer ? (
        <p className="cart__who">
          A nombre de <strong>{customer.name}</strong> ({customer.phone}).
        </p>
      ) : (
        <>
          <input className="input" placeholder="Tu nombre" aria-label="Tu nombre" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" type="tel" placeholder="Teléfono (WhatsApp)" aria-label="Teléfono" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="input" type="email" placeholder="Correo (opcional si dejas teléfono)" aria-label="Correo" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </>
      )}
      <textarea className="input cart-quote__note" placeholder="Algo que debamos saber (opcional)" aria-label="Nota" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
      {error && (
        <p className="promo__error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn--primary" disabled={pending}>
        {pending ? "Enviando…" : "Enviar cotización"}
      </button>
      <button type="button" className="promo__remove" onClick={() => setOpen(false)} disabled={pending}>
        Cancelar
      </button>
    </form>
  );
}
