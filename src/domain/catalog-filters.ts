// Filtros del catálogo: se guardan en la URL (?categoria=bolsos&orden=precio-asc)
// para que los links se puedan compartir y el bot pueda generar enlaces filtrados.

import { type CategoryId, LEATHER_COLORS, type Product, isCategoryId } from "./product";

export const KINDS = [
  { id: "taller", name: "Hechas en el taller" },
  { id: "personalizable", name: "Personalizables" },
  { id: "encargo", name: "Por encargo" },
] as const;
export type Kind = (typeof KINDS)[number]["id"];

export const AVAILABILITY_FILTERS = [
  { id: "stock", name: "Con stock" },
  { id: "pedido", name: "Sobre pedido" },
] as const;
export type AvailabilityFilter = (typeof AVAILABILITY_FILTERS)[number]["id"];

export const SORTS = [
  { id: "novedades", name: "Novedades" },
  { id: "precio-asc", name: "Precio: menor a mayor" },
  { id: "precio-desc", name: "Precio: mayor a menor" },
] as const;
export type Sort = (typeof SORTS)[number]["id"];

export interface CatalogFilters {
  q: string;
  categories: CategoryId[];
  kinds: Kind[];
  availability: AvailabilityFilter[];
  sort: Sort;
}

export const EMPTY_FILTERS: CatalogFilters = { q: "", categories: [], kinds: [], availability: [], sort: "novedades" };

type RawParams = Record<string, string | string[] | undefined>;

function list(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).flatMap((v) => v.split(",")).filter(Boolean);
}

function oneOf<T extends string>(values: readonly { id: T }[], value: string): value is T {
  return values.some((v) => v.id === value);
}

export function parseFilters(params: RawParams): CatalogFilters {
  const q = list(params.q)[0]?.trim() ?? "";
  const sortRaw = list(params.orden)[0] ?? "";
  return {
    q,
    categories: list(params.categoria).filter(isCategoryId),
    kinds: list(params.tipo).filter((v): v is Kind => oneOf(KINDS, v)),
    availability: list(params.disp).filter((v): v is AvailabilityFilter => oneOf(AVAILABILITY_FILTERS, v)),
    sort: oneOf(SORTS, sortRaw) ? sortRaw : "novedades",
  };
}

export function filtersToQuery(f: CatalogFilters): string {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  f.categories.forEach((c) => params.append("categoria", c));
  f.kinds.forEach((k) => params.append("tipo", k));
  f.availability.forEach((a) => params.append("disp", a));
  if (f.sort !== "novedades") params.set("orden", f.sort);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function hasActiveFilters(f: CatalogFilters): boolean {
  return Boolean(f.q) || f.categories.length > 0 || f.kinds.length > 0 || f.availability.length > 0;
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function matchesKind(p: Product, kind: Kind): boolean {
  if (kind === "taller") return !p.madeToOrder;
  if (kind === "personalizable") return p.customizable;
  return p.madeToOrder;
}

function matchesAvailability(p: Product, a: AvailabilityFilter): boolean {
  return a === "stock" ? p.stock > 0 : p.madeToOrder;
}

/** Aplica filtros y orden. Dentro de cada grupo es "o"; entre grupos es "y". */
export function applyFilters(products: Product[], f: CatalogFilters): Product[] {
  const terms = normalize(f.q).split(/\s+/).filter(Boolean);
  const result = products.filter((p) => {
    if (f.categories.length && !f.categories.includes(p.category)) return false;
    if (f.kinds.length && !f.kinds.some((k) => matchesKind(p, k))) return false;
    if (f.availability.length && !f.availability.some((a) => matchesAvailability(p, a))) return false;
    if (terms.length) {
      const colors = LEATHER_COLORS.filter((c) => p.options.leatherColors.includes(c.id)).map((c) => c.name);
      const haystack = normalize(`${p.name} ${p.category} ${p.description} ${colors.join(" ")}`);
      if (!terms.every((t) => haystack.includes(t))) return false;
    }
    return true;
  });

  return result.sort((a, b) => {
    if (f.sort === "precio-asc") return a.price - b.price;
    if (f.sort === "precio-desc") return b.price - a.price;
    return b.createdAt.localeCompare(a.createdAt);
  });
}
