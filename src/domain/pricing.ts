// Calculadora de precios: costo real de la pieza + margen.
// El margen es la parte del precio (sin impuesto) que queda como ganancia.

export const TAX_RATE = 0.19; // IVA Chile

export interface PricingInput {
  materialsCost: number;
  hours: number;
  hourRate: number;
  wastePct: number;
  overheadPct: number;
  commissionPct: number;
  marginPct: number;
  includeTax: boolean;
  /** Redondeo al alza: 0 (sin redondear), 100 o 1000. */
  roundTo: number;
}

export interface PricingResult {
  ok: boolean;
  /** Mensaje en palabras simples cuando no se puede calcular. */
  problem?: string;
  materials: number;
  waste: number;
  labor: number;
  overhead: number;
  cost: number;
  commission: number;
  tax: number;
  price: number;
  profit: number;
}

function roundUp(value: number, step: number): number {
  return step > 0 ? Math.ceil(value / step) * step : Math.round(value);
}

export function computePrice(i: PricingInput): PricingResult {
  const materials = Math.max(0, i.materialsCost);
  const waste = (materials * i.wastePct) / 100;
  const labor = Math.max(0, i.hours) * Math.max(0, i.hourRate);
  const base = materials + waste + labor;
  const overhead = (base * i.overheadPct) / 100;
  const cost = base + overhead;

  const share = (i.commissionPct + i.marginPct) / 100;
  if (share >= 0.95) {
    return {
      ok: false,
      problem: "La comisión más el margen no pueden sumar 95% o más del precio.",
      materials, waste, labor, overhead, cost, commission: 0, tax: 0, price: 0, profit: 0,
    };
  }

  const net = cost / (1 - share);
  const price = roundUp(i.includeTax ? net * (1 + TAX_RATE) : net, i.roundTo);
  const netFinal = i.includeTax ? price / (1 + TAX_RATE) : price;
  const tax = price - netFinal;
  const commission = (netFinal * i.commissionPct) / 100;
  const profit = netFinal - cost - commission;

  return { ok: true, materials, waste, labor, overhead, cost, commission, tax, price, profit };
}

/** Margen real (%) de un precio dado, con los mismos costos. */
export function marginOf(price: number, i: PricingInput): number {
  const r = computePrice({ ...i, marginPct: 0, roundTo: 0 });
  const netFinal = i.includeTax ? price / (1 + TAX_RATE) : price;
  if (netFinal <= 0) return 0;
  const commission = (netFinal * i.commissionPct) / 100;
  return ((netFinal - r.cost - commission) / netFinal) * 100;
}

/** Valor de la hora de trabajo del taller, en CLP. */
export const HOUR_RATE = 1200;

/** Una variación cuesta a lo más un 30% más que el precio normal de la pieza. */
export const MAX_VARIATION_SURCHARGE = 0.3;

/** Si la pieza no tiene materiales anotados, se asume que son esta parte de su precio. */
export const NO_RECIPE_MATERIAL_SHARE = 0.3;

export interface VariationInput {
  /** Precio normal de la pieza en la tienda (sin promociones). */
  basePrice: number;
  /** Costo de materiales de una unidad según su receta; null si no tiene materiales anotados. */
  materialsCost: number | null;
  /** Horas que toma hacer una unidad. */
  hours: number;
  /** Cuánto más material usa la variación, en % (ej: 25 = un cuarto más). */
  extraMaterialPct: number;
  /** Cuánto más trabajo toma, en %. */
  extraHoursPct: number;
  settings: Pick<PricingInput, "wastePct" | "overheadPct" | "commissionPct" | "marginPct">;
}

export interface VariationQuote {
  price: number;
  basePrice: number;
  materialsCost: number;
  /** true si el costo de materiales se supuso (la pieza no tiene receta). */
  estimatedMaterials: boolean;
  extraMaterialPct: number;
  extraHoursPct: number;
  extraMaterials: number;
  extraHours: number;
  extraLabor: number;
  hourRate: number;
  /** Lo que se suma al precio normal. */
  surcharge: number;
  /** true si el recargo quedó limitado al 30%. */
  capped: boolean;
}

/**
 * Precio de una variación: el precio normal de la pieza más lo que cuesta el material
 * y el trabajo extra (a HOUR_RATE la hora), llevado a precio con la misma fórmula de la
 * calculadora (gastos del taller, comisión y ganancia). El recargo se redondea a mil y
 * nunca pasa del 30% del precio normal.
 */
export function quoteVariation(i: VariationInput): VariationQuote {
  const extraMaterialPct = Math.max(0, i.extraMaterialPct);
  const extraHoursPct = Math.max(0, i.extraHoursPct);
  const estimatedMaterials = i.materialsCost === null;
  const materialsCost = i.materialsCost ?? i.basePrice * NO_RECIPE_MATERIAL_SHARE;

  const extraMaterials = (materialsCost * extraMaterialPct * (1 + i.settings.wastePct / 100)) / 100;
  const extraHours = (i.hours * extraHoursPct) / 100;
  const extraLabor = extraHours * HOUR_RATE;
  const share = Math.min(0.95, (i.settings.commissionPct + i.settings.marginPct) / 100);
  const raw = ((extraMaterials + extraLabor) * (1 + i.settings.overheadPct / 100)) / (1 - share);

  const cap = Math.floor((i.basePrice * MAX_VARIATION_SURCHARGE) / 100) * 100;
  const rounded = raw > 0 ? Math.ceil(raw / 1000) * 1000 : 0;
  const surcharge = Math.min(rounded, cap);

  return {
    price: i.basePrice + surcharge,
    basePrice: i.basePrice,
    materialsCost: Math.round(materialsCost),
    estimatedMaterials,
    extraMaterialPct,
    extraHoursPct,
    extraMaterials: Math.round(extraMaterials),
    extraHours,
    extraLabor: Math.round(extraLabor),
    hourRate: HOUR_RATE,
    surcharge,
    capped: rounded > cap,
  };
}

export const DEFAULT_PRICING = {
  hourRate: HOUR_RATE,
  wastePct: 10,
  overheadPct: 10,
  commissionPct: 0,
  marginPct: 40,
  includeTax: false,
  roundTo: 1000,
};
