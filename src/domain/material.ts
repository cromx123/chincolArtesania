// Materiales (insumos) del taller y sus niveles de stock.

export const MATERIAL_KINDS = [
  { id: "cuero", name: "Cueros" },
  { id: "hilo", name: "Hilos" },
  { id: "herraje", name: "Herrajes" },
  { id: "acabado", name: "Acabados" },
  { id: "otro", name: "Otros" },
] as const;
export type MaterialKind = (typeof MATERIAL_KINDS)[number]["id"];

export const MATERIAL_UNITS = [
  { id: "pie2", short: "pie²", long: "pies cuadrados" },
  { id: "m", short: "m", long: "metros" },
  { id: "u", short: "u", long: "unidades" },
  { id: "l", short: "L", long: "litros" },
] as const;
export type MaterialUnit = (typeof MATERIAL_UNITS)[number]["id"];

export interface Material {
  id: string;
  name: string;
  kind: MaterialKind;
  unit: MaterialUnit;
  stock: number;
  minStock: number;
  /** CLP por unidad de medida. */
  unitCost: number;
  supplier: string | null;
}

export type MaterialLevel = "ok" | "low" | "critical" | "empty";

export function materialLevel(m: Pick<Material, "stock" | "minStock">): MaterialLevel {
  if (m.stock <= 0) return "empty";
  if (m.minStock <= 0 || m.stock >= m.minStock) return "ok";
  return m.stock < m.minStock / 2 ? "critical" : "low";
}

export const LEVEL_LABEL: Record<MaterialLevel, string> = {
  ok: "Bien",
  low: "Queda poco",
  critical: "Casi no queda",
  empty: "Se acabó",
};

export function needsRestock(m: Pick<Material, "stock" | "minStock">): boolean {
  return materialLevel(m) !== "ok";
}

export function unitShort(unit: MaterialUnit): string {
  return MATERIAL_UNITS.find((u) => u.id === unit)?.short ?? unit;
}

export function isMaterialKind(v: string): v is MaterialKind {
  return MATERIAL_KINDS.some((k) => k.id === v);
}

export function isMaterialUnit(v: string): v is MaterialUnit {
  return MATERIAL_UNITS.some((u) => u.id === v);
}

/** 1.5 → "1,5"; 12 → "12". */
export function formatQuantity(value: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(value);
}

export function formatAmount(value: number, unit: MaterialUnit): string {
  return `${formatQuantity(value)} ${unitShort(unit)}`;
}
