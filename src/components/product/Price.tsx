import type { Product } from "@/domain/product";
import { formatPrice } from "@/lib/format";

/** Precio de la pieza; con oferta, el normal tachado y el rebajado al lado. */
export function Price({ product, className }: { product: Pick<Product, "price" | "offer">; className: string }) {
  if (!product.offer) return <span className={className}>{formatPrice(product.price)}</span>;
  return (
    <span className={`${className} price--offer`}>
      <s className="price__was">
        <span className="sr-only">Antes </span>
        {formatPrice(product.price)}
      </s>{" "}
      <span className="price__now">
        <span className="sr-only">Ahora </span>
        {formatPrice(product.offer.price)}
      </span>
    </span>
  );
}
