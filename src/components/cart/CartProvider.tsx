"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { type CartItem, type CartSelection, cartCount, cartItemKey, cartTotal } from "@/domain/cart";
import { type Product, effectivePrice } from "@/domain/product";

const STORAGE_KEY = "chincol.cart.v1";

type AddInput = { productId: string; slug: string; name: string; unitPrice: number; quantity: number; selection: CartSelection };

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  ready: boolean;
  add: (input: AddInput) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/** Carrito del visitante, guardado en su navegador. */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved));
    } catch {
      // Sin almacenamiento disponible: el carrito vive solo en esta visita.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, ready]);

  // El carrito guarda el precio del momento en que se agregó: al abrir la tienda se
  // actualiza con el de hoy, por si empezó o terminó una oferta.
  useEffect(() => {
    if (!ready) return;
    const slugs = [...new Set(items.map((i) => i.slug))];
    if (slugs.length === 0) return;
    let cancelled = false;
    Promise.all(
      slugs.map((slug) =>
        fetch(`/api/products/${encodeURIComponent(slug)}`)
          .then((r) => (r.ok ? (r.json() as Promise<Product>) : null))
          .catch(() => null),
      ),
    ).then((products) => {
      if (cancelled) return;
      const prices = new Map(products.filter((p): p is Product => p !== null).map((p) => [p.slug, effectivePrice(p)]));
      setItems((prev) => {
        const changed = prev.some((i) => prices.has(i.slug) && prices.get(i.slug) !== i.unitPrice);
        return changed ? prev.map((i) => (prices.has(i.slug) ? { ...i, unitPrice: prices.get(i.slug)! } : i)) : prev;
      });
    });
    return () => {
      cancelled = true;
    };
    // Solo al cargar: después, los precios nuevos llegan al agregar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const add = useCallback((input: AddInput) => {
    const key = cartItemKey(input.productId, input.selection);
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) return prev.map((i) => (i.key === key ? { ...i, unitPrice: input.unitPrice, quantity: i.quantity + input.quantity } : i));
      return [...prev, { ...input, key }];
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) => (quantity <= 0 ? prev.filter((i) => i.key !== key) : prev.map((i) => (i.key === key ? { ...i, quantity } : i))));
  }, []);

  const remove = useCallback((key: string) => setItems((prev) => prev.filter((i) => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, count: cartCount(items), total: cartTotal(items), ready, add, setQuantity, remove, clear }),
    [items, ready, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
