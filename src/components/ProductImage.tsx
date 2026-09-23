import Image from "next/image";
import type { Product } from "@/domain/product";
import { CategoryGlyph } from "./icons";

type Props = {
  product: Product;
  index?: number;
  sizes: string;
  glyphSize?: number;
  priority?: boolean;
};

/** Foto del producto, o la silueta de su categoría si aún no hay fotos. */
export function ProductImage({ product, index = 0, sizes, glyphSize = 52, priority }: Props) {
  const src = product.images[index];
  if (src) {
    // Las fotos subidas desde el administrador ya vienen comprimidas.
    const uploaded = src.startsWith("/fotos/");
    return <Image src={src} alt={product.name} fill sizes={sizes} priority={priority} unoptimized={uploaded} className="product-image__img" />;
  }
  return (
    <span className="product-image__placeholder" role="img" aria-label={`${product.name} (foto pendiente)`}>
      <CategoryGlyph category={product.category} size={glyphSize} />
    </span>
  );
}
