import "server-only";
import type { Material as DbMaterial, Product as DbProduct } from "@prisma/client";
import { type CategoryId, type LeatherColorId, type Product, type ThreadColorId, isCategoryId } from "@/domain/product";
import { type Material, type MaterialKind, type MaterialUnit, isMaterialKind, isMaterialUnit } from "@/domain/material";

function parseList<T extends string>(json: string): T[] {
  try {
    const value = JSON.parse(json);
    return Array.isArray(value) ? value.filter((v): v is T => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Fila de la base → producto público del catálogo. */
export function toProduct(row: DbProduct): Product {
  const leatherColors = parseList<LeatherColorId>(row.leatherColors);
  const threadColors = parseList<ThreadColorId>(row.threadColors);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: (isCategoryId(row.category) ? row.category : "accesorios") as CategoryId,
    description: row.description,
    price: row.price,
    stock: row.stock,
    madeToOrder: row.madeToOrder,
    customizable: leatherColors.length > 1 || threadColors.length > 1 || row.engraving,
    options: { leatherColors, threadColors, engraving: row.engraving },
    images: parseList<string>(row.images),
    details: {
      measures: row.measures ?? undefined,
      materials: row.materialsText ?? undefined,
      care: row.care ?? undefined,
    },
    featured: row.featured,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toMaterial(row: DbMaterial): Material {
  return {
    id: row.id,
    name: row.name,
    kind: (isMaterialKind(row.kind) ? row.kind : "otro") as MaterialKind,
    unit: (isMaterialUnit(row.unit) ? row.unit : "u") as MaterialUnit,
    stock: row.stock,
    minStock: row.minStock,
    unitCost: row.unitCost,
    supplier: row.supplier,
  };
}
