import Link from "next/link";
import { type Product, categoryName, getBadge } from "@/domain/product";
import { formatPrice } from "@/lib/format";
import { ProductImage } from "./ProductImage";

export function ProductCard({ product }: { product: Product }) {
  const badge = getBadge(product);
  return (
    <Link href={`/catalogo/${product.slug}`} className="product-card">
      <span className="product-card__media product-image">
        {badge && <span className={`badge badge--${badge.tone}`}>{badge.label}</span>}
        <ProductImage product={product} sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 300px" />
      </span>
      <span className="product-card__body">
        <span className="eyebrow">{categoryName(product.category)}</span>
        <span className="product-card__name">{product.name}</span>
        <span className="product-card__price">{formatPrice(product.price)}</span>
      </span>
    </Link>
  );
}

export function ProductGrid({ products, variant }: { products: Product[]; variant?: "home" }) {
  return (
    <div className={`product-grid${variant === "home" ? " product-grid--home" : ""}`}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
