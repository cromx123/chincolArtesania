"use client";

import Link from "next/link";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import type { CategoryId } from "@/domain/product";
import type { RecipeLine } from "@/domain/production";
import { formatPrice } from "@/lib/format";
import { adjustProductStockAction } from "@/app/admin/_actions/products";
import { HammerIcon, SearchIcon } from "../icons";
import { Notice } from "./Notice";
import { ProduceSheet } from "./ProduceSheet";
import { ProductThumb } from "./ProductThumb";

export interface ProductListItem {
  id: string;
  name: string;
  category: CategoryId;
  categoryName: string;
  price: number;
  stock: number;
  lowStockAlert: number;
  madeToOrder: boolean;
  published: boolean;
  image?: string;
  recipe: RecipeLine[];
  canMake: number | null;
}

const FILTERS = [
  { id: "todos", name: "Todos" },
  { id: "pocos", name: "Por acabarse" },
  { id: "pedido", name: "A pedido" },
  { id: "ocultos", name: "Ocultos" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

function isLow(p: ProductListItem) {
  return !p.madeToOrder && p.stock <= p.lowStockAlert;
}

function StockControl({ product }: { product: ProductListItem }) {
  const [stock, setStock] = useOptimistic(product.stock);
  const [, start] = useTransition();

  function change(delta: number) {
    start(async () => {
      setStock(Math.max(0, stock + delta));
      await adjustProductStockAction(product.id, delta);
    });
  }

  return (
    <div className="a-stock">
      <span className="a-stock__label">Hechas</span>
      <div className="a-stepper">
        <button type="button" aria-label={`Restar una: ${product.name}`} disabled={stock <= 0} onClick={() => change(-1)}>
          −
        </button>
        <output className={stock === 0 ? "is-bad" : isLow({ ...product, stock }) ? "is-warn" : undefined}>{stock}</output>
        <button type="button" aria-label={`Sumar una: ${product.name}`} onClick={() => change(1)}>
          +
        </button>
      </div>
    </div>
  );
}

export function ProductList({ products, notice }: { products: ProductListItem[]; notice: string | null }) {
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");
  const [producing, setProducing] = useState<ProductListItem | null>(null);
  const [message, setMessage] = useState<string | null>(notice);

  const counts: Record<Filter, number> = {
    todos: products.length,
    pocos: products.filter(isLow).length,
    pedido: products.filter((p) => p.madeToOrder).length,
    ocultos: products.filter((p) => !p.published).length,
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (filter === "pocos") return isLow(p);
      if (filter === "pedido") return p.madeToOrder;
      if (filter === "ocultos") return !p.published;
      return true;
    });
  }, [products, filter, query]);

  return (
    <>
      <Notice message={message} />
      <div className="a-toolbar">
        <div className="a-search">
          <SearchIcon size={18} />
          <input type="search" className="a-input" placeholder="Buscar producto…" aria-label="Buscar producto" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="a-tabs" role="tablist" aria-label="Filtrar productos">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className="a-tabs__tab" onClick={() => setFilter(f.id)}>
              {f.name} <span>{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="a-empty">No hay productos en esta lista.</p>
      ) : (
        <ul className="a-products">
          {visible.map((p) => (
            <li key={p.id} className="a-product">
              <Link href={`/admin/productos/${p.id}`} className="a-product__link">
                <ProductThumb image={p.image} category={p.category} size={64} />
                <span className="a-product__info">
                  <strong>{p.name}</strong>
                  <span className="a-muted">
                    {p.categoryName} · {formatPrice(p.price)}
                  </span>
                  <span className="a-product__tags">
                    {!p.published && <span className="a-pill">Oculto en la tienda</span>}
                    {p.madeToOrder && <span className="a-pill a-pill--info">A pedido</span>}
                    {!p.madeToOrder && p.stock === 0 && <span className="a-pill a-pill--bad">Agotado</span>}
                    {!p.madeToOrder && p.stock > 0 && isLow(p) && <span className="a-pill a-pill--warn">Quedan pocas</span>}
                    {p.canMake !== null && <span className="a-pill a-pill--plain">Materiales para {p.canMake} más</span>}
                  </span>
                </span>
                <span className="a-product__edit">Editar</span>
              </Link>
              <div className="a-product__actions">
                {p.madeToOrder ? <span className="a-muted a-small">Se hace cuando lo piden</span> : <StockControl product={p} />}
                {!p.madeToOrder && (
                  <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => setProducing(p)}>
                    <HammerIcon size={17} /> Hice más
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {producing && (
        <ProduceSheet
          open
          product={producing}
          onClose={() => setProducing(null)}
          onDone={(m) => {
            setProducing(null);
            setMessage(m);
          }}
        />
      )}
    </>
  );
}
