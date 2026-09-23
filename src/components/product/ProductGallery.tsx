"use client";

import { useState } from "react";
import type { Product } from "@/domain/product";
import { ProductImage } from "../ProductImage";

export function ProductGallery({ product }: { product: Product }) {
  const [active, setActive] = useState(0);
  const count = product.images.length;

  return (
    <div className="gallery">
      <div className="gallery__main product-image">
        <ProductImage product={product} index={active} sizes="(max-width: 900px) 100vw, 640px" glyphSize={84} priority />
      </div>
      {count > 1 && (
        <div className="gallery__thumbs">
          {product.images.map((_, i) => (
            <button
              key={i}
              type="button"
              className="gallery__thumb product-image"
              aria-label={`Ver foto ${i + 1}`}
              aria-pressed={active === i}
              onClick={() => setActive(i)}
            >
              <ProductImage product={product} index={i} sizes="120px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
