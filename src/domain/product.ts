// Modelo de producto y reglas de negocio del catálogo.
// Código puro (sin React ni Next): lo usan la web, la API y, más adelante, el bot.

export const CATEGORIES = [
  { id: "billeteras", name: "Billeteras" },
  { id: "bolsos", name: "Bolsos" },
  { id: "cinturones", name: "Cinturones" },
  { id: "mochilas", name: "Mochilas" },
  { id: "accesorios", name: "Accesorios" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const LEATHER_COLORS = [
  { id: "caramelo", name: "Caramelo", hex: "#A9623A" },
  { id: "cafe-oscuro", name: "Café oscuro", hex: "#4A2E1E" },
  { id: "natural", name: "Natural", hex: "#D2B48C" },
  { id: "negro", name: "Negro", hex: "#24201D" },
] as const;

export const THREAD_COLORS = [
  { id: "natural", name: "Natural" },
  { id: "cafe", name: "Café" },
  { id: "negro", name: "Negro" },
] as const;

export type LeatherColorId = (typeof LEATHER_COLORS)[number]["id"];
export type ThreadColorId = (typeof THREAD_COLORS)[number]["id"];

export interface ProductOptions {
  leatherColors: LeatherColorId[];
  threadColors: ThreadColorId[];
  /** Permite grabar hasta 3 iniciales. */
  engraving: boolean;
}

export interface ProductDetails {
  measures?: string;
  materials?: string;
  care?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: CategoryId;
  description: string;
  /** Precio en pesos chilenos (CLP), sin decimales. */
  price: number;
  /** Unidades terminadas en el taller. */
  stock: number;
  /** Se fabrica cuando alguien lo pide (no depende del stock). */
  madeToOrder: boolean;
  /** Admite elegir cuero, hilo o grabado. */
  customizable: boolean;
  options: ProductOptions;
  /** Rutas o URLs de fotos; vacío = se muestra un marcador. */
  images: string[];
  details?: ProductDetails;
  featured?: boolean;
  /** ISO 8601, sirve para ordenar por novedades. */
  createdAt: string;
}

export const LOW_STOCK_THRESHOLD = 2;

export type Availability = "in_stock" | "low_stock" | "made_to_order" | "out_of_stock";

export function getAvailability(p: Product): Availability {
  if (p.stock > 0) return p.stock <= LOW_STOCK_THRESHOLD ? "low_stock" : "in_stock";
  return p.madeToOrder ? "made_to_order" : "out_of_stock";
}

/** Se puede agregar al carrito si hay stock o si se fabrica a pedido. */
export function isPurchasable(p: Product): boolean {
  return getAvailability(p) !== "out_of_stock";
}

export function availabilityLabel(p: Product): string {
  switch (getAvailability(p)) {
    case "in_stock":
    case "low_stock":
      return p.stock === 1 ? "1 disponible" : `${p.stock} disponibles`;
    case "made_to_order":
      return "Sobre pedido";
    case "out_of_stock":
      return "Agotado";
  }
}

export type BadgeTone = "dark" | "accent" | "muted";

/** Etiqueta destacada de la tarjeta (una sola, por prioridad). */
export function getBadge(p: Product): { label: string; tone: BadgeTone } | null {
  const availability = getAvailability(p);
  if (availability === "low_stock") return { label: p.stock === 1 ? "Última unidad" : `Últimas ${p.stock}`, tone: "dark" };
  if (availability === "out_of_stock") return { label: "Agotado", tone: "muted" };
  if (p.customizable) return { label: "Personalizable", tone: "accent" };
  if (availability === "made_to_order") return { label: "Sobre pedido", tone: "muted" };
  return null;
}

export function categoryName(id: CategoryId): string {
  return CATEGORIES.find((c) => c.id === id)?.name ?? id;
}

export function isCategoryId(value: string): value is CategoryId {
  return CATEGORIES.some((c) => c.id === value);
}
