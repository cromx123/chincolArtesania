import "server-only";
import { availabilityLabel, categoryName, type Product } from "@/domain/product";
import { parseFilters, filtersToQuery } from "@/domain/catalog-filters";
import { catalogService } from "../container";

// Herramientas que el futuro bot (asistente web, WhatsApp, Instagram) podrá usar.
// Siguen el formato de "tool use" de la API de Claude: nombre, descripción y
// `input_schema` (JSON Schema). El bot no toca datos directamente: pasa por
// los mismos servicios que la web, así nunca inventa stock ni precios.

/** Vista compacta de un producto para el bot. */
function toBotProduct(p: Product) {
  return {
    id: p.id,
    nombre: p.name,
    categoria: categoryName(p.category),
    precio_clp: p.price,
    disponibilidad: availabilityLabel(p),
    personalizable: p.customizable,
    url: `/catalogo/${p.slug}`,
  };
}

export const catalogTools = [
  {
    name: "buscar_productos",
    description:
      "Busca piezas en el catálogo de Chincol Artesanía. Úsala cuando el cliente pregunte qué hay, por una categoría, por stock o por precio.",
    input_schema: {
      type: "object",
      properties: {
        texto: { type: "string", description: "Palabras a buscar, ej: 'bolso café'" },
        categoria: { type: "string", enum: ["billeteras", "bolsos", "cinturones", "mochilas", "accesorios"] },
        solo_con_stock: { type: "boolean" },
      },
    },
    async run(input: { texto?: string; categoria?: string; solo_con_stock?: boolean }) {
      const filters = parseFilters({
        q: input.texto,
        categoria: input.categoria,
        disp: input.solo_con_stock ? "stock" : undefined,
      });
      const products = await catalogService.search(filters);
      return { resultados: products.map(toBotProduct), enlace_catalogo: `/catalogo${filtersToQuery(filters)}` };
    },
  },
  {
    name: "ver_producto",
    description: "Devuelve el detalle de una pieza: descripción, opciones de cuero e hilo, grabado y disponibilidad.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string", description: "id del producto, ej: p-002" } },
      required: ["id"],
    },
    async run(input: { id: string }) {
      const p = await catalogService.getById(input.id);
      if (!p) return { error: "Producto no encontrado" };
      return { ...toBotProduct(p), descripcion: p.description, opciones: p.options, detalles: p.details ?? {} };
    },
  },
] as const;

export type CatalogToolName = (typeof catalogTools)[number]["name"];
