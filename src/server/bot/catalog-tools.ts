import "server-only";
import { LEATHER_COLORS, availabilityLabel, categoryName, effectivePrice, type Product } from "@/domain/product";
import { EMPTY_FILTERS, parseFilters, filtersToQuery } from "@/domain/catalog-filters";
import { catalogService } from "../container";

const MAX_RESULTS = 12;

// Palabras que no ayudan a encontrar una pieza ("el chanchito de cuero" → "chanchito", "cuero").
const STOPWORDS = new Set(["de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas", "y", "o", "con", "sin", "para", "en", "por", "al", "que", "mi", "su", "tienen", "hay"]);

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** "chanchitos" también busca "chanchito"; "cinturones", "cinturon". */
function variants(term: string): string[] {
  const out = [term];
  if (term.length > 4 && term.endsWith("es")) out.push(term.slice(0, -2));
  if (term.length > 3 && term.endsWith("s")) out.push(term.slice(0, -1));
  return out;
}

function haystack(p: Product): string {
  const colors = LEATHER_COLORS.filter((c) => p.options.leatherColors.includes(c.id)).map((c) => c.name);
  return normalize(`${p.name} ${categoryName(p.category)} ${p.description} ${colors.join(" ")}`);
}

/**
 * Búsqueda tolerante para el bot. Los clientes escriben frases ("el chanchito de cuero"),
 * plurales o palabras que no están en la ficha. Primero exige todas las palabras
 * importantes; si no hay nada, ordena por cuántas calzan, con el nombre pesando más.
 */
function looseMatch(products: Product[], query: string): { list: Product[]; exact: boolean } {
  const terms = normalize(query)
    .split(/[^a-z0-9ñ]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  if (terms.length === 0) return { list: products, exact: true };
  const hits = (text: string, t: string) => variants(t).some((v) => text.includes(v));

  const exact = products.filter((p) => terms.every((t) => hits(haystack(p), t)));
  if (exact.length) return { list: exact, exact: true };

  const scored = products
    .map((p) => {
      const name = normalize(p.name);
      const text = haystack(p);
      return { p, score: terms.reduce((s, t) => s + (hits(name, t) ? 2 : hits(text, t) ? 1 : 0), 0) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return { list: scored.map((x) => x.p), exact: false };
}

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
    precio_clp: effectivePrice(p),
    ...(p.offer ? { oferta: { precio_normal_clp: p.price, descuento_pct: p.offer.percent, hasta: p.offer.until } } : {}),
    disponibilidad: availabilityLabel(p),
    personalizable: p.customizable,
    url: `/catalogo/${p.slug}`,
  };
}

export const catalogTools = [
  {
    name: "buscar_productos",
    description:
      "Busca piezas en el catálogo de Chincol Artesanía, incluidas las agotadas. Úsala cuando el cliente pregunte qué hay, por una pieza, una categoría, stock o precio. " +
      "Busca con la palabra principal (ej: 'chanchito', 'bolso café'), no con la frase completa del cliente.",
    input_schema: {
      type: "object",
      properties: {
        texto: { type: "string", description: "Palabras a buscar, ej: 'bolso café'" },
        categoria: { type: "string", enum: ["billeteras", "bolsos", "cinturones", "mochilas", "accesorios"] },
        solo_con_stock: {
          type: "boolean",
          description: "Solo para listar lo disponible ahora. No lo uses para preguntar por una pieza puntual: la ocultaría si está agotada.",
        },
      },
    },
    async run(input: { texto?: string; categoria?: string; solo_con_stock?: boolean }) {
      const filters = parseFilters({ q: input.texto, categoria: input.categoria });
      const inCategory = await catalogService.search({ ...EMPTY_FILTERS, categories: filters.categories });
      const { list, exact } = looseMatch(inCategory, filters.q);
      const link = `/catalogo${filtersToQuery(exact ? filters : { ...filters, q: "" })}`;

      if (input.solo_con_stock) {
        const available = list.filter((p) => p.stock > 0);
        if (available.length === 0 && list.length > 0) {
          return {
            resultados: list.slice(0, MAX_RESULTS).map(toBotProduct),
            nota: "Ninguna tiene stock ahora (están agotadas o son sobre pedido), pero se pueden encargar.",
            enlace_catalogo: link,
          };
        }
        return { resultados: available.slice(0, MAX_RESULTS).map(toBotProduct), enlace_catalogo: link };
      }
      return {
        resultados: list.slice(0, MAX_RESULTS).map(toBotProduct),
        ...(exact || list.length === 0 ? {} : { nota: "No calzaron todas las palabras: son las piezas más parecidas." }),
        enlace_catalogo: link,
      };
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
