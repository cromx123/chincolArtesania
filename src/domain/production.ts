// "Receta" de un producto: cuánto material usa cada unidad.

import type { Material } from "./material";

export interface RecipeLine {
  material: Material;
  /** Cantidad por unidad de producto, en la unidad del material. */
  quantity: number;
}

/** Costo de materiales de una unidad. */
export function recipeCost(recipe: RecipeLine[]): number {
  return Math.round(recipe.reduce((sum, l) => sum + l.quantity * l.material.unitCost, 0));
}

/** Cuántas unidades se pueden fabricar con el stock actual; null si no hay receta. */
export function unitsPossible(recipe: RecipeLine[]): number | null {
  const lines = recipe.filter((l) => l.quantity > 0);
  if (lines.length === 0) return null;
  return Math.max(0, Math.min(...lines.map((l) => Math.floor(l.material.stock / l.quantity))));
}

/** Materiales que no alcanzan para fabricar `units` unidades. */
export function missingMaterials(recipe: RecipeLine[], units: number): RecipeLine[] {
  return recipe.filter((l) => l.quantity * units > l.material.stock);
}
