// Carga datos de EJEMPLO para probar el sistema (productos del mockup, materiales y recetas).
// Solo corre si la base está vacía. Uso: `npm run db:seed`.

import { PrismaClient } from "@prisma/client";
import products from "../data/products.json";

const db = new PrismaClient();

// Materiales tomados del mockup. Stock, mínimos y costos son de ejemplo.
const MATERIALS = [
  { key: "cuero-caramelo", name: "Cuero curtido vegetal 2 mm — caramelo", kind: "cuero", unit: "pie2", stock: 42, minStock: 30, unitCost: 4500 },
  { key: "cuero-cafe", name: "Cuero curtido vegetal 2 mm — café", kind: "cuero", unit: "pie2", stock: 18, minStock: 30, unitCost: 4500 },
  { key: "cuero-negro", name: "Cuero graso 1.8 mm — negro", kind: "cuero", unit: "pie2", stock: 6, minStock: 20, unitCost: 5200 },
  { key: "hilo-natural", name: "Hilo encerado 1 mm — natural", kind: "hilo", unit: "m", stock: 220, minStock: 100, unitCost: 40 },
  { key: "hilo-cafe", name: "Hilo encerado 1 mm — café", kind: "hilo", unit: "m", stock: 85, minStock: 100, unitCost: 40 },
  { key: "hebilla", name: "Hebilla bronce 30 mm", kind: "herraje", unit: "u", stock: 34, minStock: 20, unitCost: 1800 },
  { key: "remache", name: "Remache doble cabeza 9 mm", kind: "herraje", unit: "u", stock: 310, minStock: 150, unitCost: 60 },
  { key: "iman", name: "Broche imán 18 mm", kind: "herraje", unit: "u", stock: 48, minStock: 25, unitCost: 450 },
  { key: "tinte", name: "Tinte al agua — café", kind: "acabado", unit: "l", stock: 1.2, minStock: 1, unitCost: 12000 },
] as const;

type Key = (typeof MATERIALS)[number]["key"];

// Receta por unidad (slug del producto → material → cantidad). De ejemplo.
const RECIPES: Record<string, Partial<Record<Key, number>>> = {
  "bolso-maletin-andes": { "cuero-caramelo": 8, "hilo-natural": 14, hebilla: 2, remache: 12 },
  "billetera-nire": { "cuero-caramelo": 1.5, "hilo-natural": 3 },
  "cinturon-trenzado": { "cuero-cafe": 2, hebilla: 1 },
  "mochila-cuero-graso": { "cuero-negro": 10, "hilo-cafe": 18, remache: 16, iman: 2 },
  portadocumentos: { "cuero-caramelo": 3, "hilo-natural": 6, iman: 1 },
  "llavero-trenza": { "cuero-cafe": 0.2, remache: 1 },
};

async function main() {
  if ((await db.product.count()) > 0) {
    console.log("La base ya tiene datos: no se cargó nada.");
    return;
  }

  const ids = new Map<Key, string>();
  for (const { key, ...m } of MATERIALS) {
    const row = await db.material.create({ data: m });
    ids.set(key, row.id);
  }

  for (const p of products) {
    const product = await db.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        category: p.category,
        description: p.description,
        price: p.price,
        stock: p.stock,
        madeToOrder: p.madeToOrder,
        leatherColors: JSON.stringify(p.options.leatherColors),
        threadColors: JSON.stringify(p.options.threadColors),
        engraving: p.options.engraving,
        images: JSON.stringify(p.images),
        materialsText: (p as { details?: { materials?: string } }).details?.materials ?? null,
        featured: Boolean((p as { featured?: boolean }).featured),
        createdAt: new Date(p.createdAt),
      },
    });
    for (const [key, quantity] of Object.entries(RECIPES[p.slug] ?? {})) {
      await db.recipeItem.create({ data: { productId: product.id, materialId: ids.get(key as Key)!, quantity: quantity! } });
    }
  }
  console.log(`Listo: ${products.length} productos y ${MATERIALS.length} materiales de ejemplo.`);
}

main().finally(() => db.$disconnect());
