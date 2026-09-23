import type { CategoryId } from "@/domain/product";
import { CategoryGlyph } from "../icons";

/** Miniatura cuadrada: la foto principal o la silueta de la categoría. */
export function ProductThumb({ image, category, size = 48 }: { image?: string; category: CategoryId; size?: number }) {
  return (
    <span className="a-thumb" style={{ width: size, height: size }}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" loading="lazy" />
      ) : (
        <CategoryGlyph category={category} size={Math.round(size * 0.55)} />
      )}
    </span>
  );
}
