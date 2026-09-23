import "server-only";
import type { Prisma } from "@prisma/client";
import {
  CATEGORIES,
  LEATHER_COLORS,
  type LeatherColorId,
  type Product,
  THREAD_COLORS,
  type ThreadColorId,
  isCategoryId,
} from "@/domain/product";
import { type RecipeLine, missingMaterials } from "@/domain/production";
import { db } from "../db";
import { toMaterial, toProduct } from "../mappers";

export interface AdminProduct extends Product {
  published: boolean;
  lowStockAlert: number;
  recipe: RecipeLine[];
}

export interface ProductInput {
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  lowStockAlert: number;
  madeToOrder: boolean;
  leatherColors: string[];
  threadColors: string[];
  engraving: boolean;
  images: string[];
  measures: string;
  materialsText: string;
  care: string;
  featured: boolean;
  published: boolean;
  recipe: { materialId: string; quantity: number }[];
}

export type FieldErrors = Partial<Record<keyof ProductInput, string>>;

export type SaveResult = { ok: true; id: string } | { ok: false; errors: FieldErrors };

const include = { recipe: { include: { material: true } } } as const;

function toAdminProduct(row: Prisma.ProductGetPayload<{ include: typeof include }>): AdminProduct {
  return {
    ...toProduct(row),
    published: row.published,
    lowStockAlert: row.lowStockAlert,
    recipe: row.recipe.map((r) => ({ material: toMaterial(r.material), quantity: r.quantity })),
  };
}

function findRow(id: string) {
  return db.product.findUnique({ where: { id }, include });
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "producto";
}

async function uniqueSlug(name: string, exceptId?: string): Promise<string> {
  const base = slugify(name);
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const taken = await db.product.findFirst({ where: { slug, NOT: exceptId ? { id: exceptId } : undefined } });
    if (!taken) return slug;
  }
}

/** Revisa los datos y los explica en palabras simples. */
function validate(input: ProductInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.name.trim()) errors.name = "Escribe el nombre de la pieza.";
  if (!isCategoryId(input.category)) errors.category = "Elige una categoría.";
  if (!Number.isFinite(input.price) || input.price <= 0) errors.price = "Escribe el precio (solo números).";
  if (!Number.isInteger(input.stock) || input.stock < 0) errors.stock = "El stock debe ser 0 o más.";
  if (input.recipe.some((r) => !(r.quantity > 0))) errors.recipe = "Cada material debe tener una cantidad mayor a 0.";
  return errors;
}

function clean(input: ProductInput) {
  const leather = input.leatherColors.filter((c): c is LeatherColorId => LEATHER_COLORS.some((l) => l.id === c));
  const thread = input.threadColors.filter((c): c is ThreadColorId => THREAD_COLORS.some((t) => t.id === c));
  return {
    name: input.name.trim(),
    category: input.category,
    description: input.description.trim(),
    price: Math.round(input.price),
    stock: input.madeToOrder ? 0 : input.stock,
    lowStockAlert: Math.max(0, Math.round(input.lowStockAlert)),
    madeToOrder: input.madeToOrder,
    leatherColors: JSON.stringify(leather),
    threadColors: JSON.stringify(thread),
    engraving: input.engraving,
    images: JSON.stringify(input.images.slice(0, 8)),
    measures: input.measures.trim() || null,
    materialsText: input.materialsText.trim() || null,
    care: input.care.trim() || null,
    featured: input.featured,
    published: input.published,
  };
}

export const productAdminService = {
  async list(): Promise<AdminProduct[]> {
    const rows = await db.product.findMany({ include, orderBy: { createdAt: "desc" } });
    return rows.map(toAdminProduct);
  },

  async get(id: string): Promise<AdminProduct | null> {
    const row = await findRow(id);
    return row ? toAdminProduct(row) : null;
  },

  async save(id: string | null, input: ProductInput): Promise<SaveResult> {
    const errors = validate(input);
    if (Object.keys(errors).length) return { ok: false, errors };

    const data = clean(input);
    const slug = await uniqueSlug(data.name, id ?? undefined);
    const recipe = input.recipe.map((r) => ({ materialId: r.materialId, quantity: r.quantity }));

    const saved = await db.$transaction(async (tx) => {
      const product = id
        ? await tx.product.update({ where: { id }, data: { ...data, slug } })
        : await tx.product.create({ data: { ...data, slug } });
      await tx.recipeItem.deleteMany({ where: { productId: product.id } });
      if (recipe.length) await tx.recipeItem.createMany({ data: recipe.map((r) => ({ ...r, productId: product.id })) });
      return product;
    });
    return { ok: true, id: saved.id };
  },

  async remove(id: string): Promise<string[]> {
    const product = await db.product.delete({ where: { id } });
    return JSON.parse(product.images) as string[];
  },

  async setDescription(id: string, description: string) {
    await db.product.update({ where: { id }, data: { description: description.trim() } });
  },

  async setPrice(id: string, price: number) {
    if (!(price > 0)) throw new Error("Precio inválido");
    await db.product.update({ where: { id }, data: { price: Math.round(price) } });
  },

  async adjustStock(id: string, delta: number): Promise<number> {
    const p = await db.product.findUniqueOrThrow({ where: { id } });
    const stock = Math.max(0, p.stock + delta);
    await db.product.update({ where: { id }, data: { stock } });
    return stock;
  },

  /**
   * "Hice más piezas": suma al stock y descuenta los materiales de la receta.
   * Si un material no alcanza, queda en 0 (ella conoce el taller mejor que el sistema).
   */
  async produce(id: string, units: number) {
    if (!Number.isInteger(units) || units <= 0) throw new Error("Cantidad inválida");
    const product = await this.get(id);
    if (!product) throw new Error("Producto no encontrado");
    const missing = missingMaterials(product.recipe, units).map((l) => l.material.name);

    await db.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: { stock: { increment: units } } });
      for (const line of product.recipe) {
        const used = Math.min(line.material.stock, line.quantity * units);
        if (used <= 0) continue;
        await tx.material.update({ where: { id: line.material.id }, data: { stock: { decrement: used } } });
        await tx.materialMovement.create({
          data: { materialId: line.material.id, delta: -used, reason: "fabricacion", productId: id, note: `${units} × ${product.name}` },
        });
      }
    });
    return { missing };
  },
};

export const CATEGORY_OPTIONS = CATEGORIES;
