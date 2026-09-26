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

export interface EstimateRangeInput extends Omit<PricingInput, "materialsCost" | "hours"> {
  /** Costo de materiales de la pieza base (receta actual). */
  baseMaterialsCost: number;
  /** Horas base de la pieza (Product.hours o un valor por defecto). */
  baseHours: number;
  /** Multiplicadores sobre materiales para reflejar la variación pedida, ej: [1, 1.3]. */
  materialsFactorRange: [number, number];
  /** Multiplicadores sobre horas para reflejar la variación pedida, ej: [1, 1.3]. */
  hoursFactorRange: [number, number];
}

export interface EstimateRange {
  low: PricingResult;
  high: PricingResult;
}

/** Rango estimado para una variación de una pieza existente: corre computePrice en los dos extremos. */
export function estimateRange(i: EstimateRangeInput): EstimateRange {
  const { baseMaterialsCost, baseHours, materialsFactorRange, hoursFactorRange, ...rest } = i;
  const low = computePrice({
    ...rest,
    materialsCost: baseMaterialsCost * materialsFactorRange[0],
    hours: baseHours * hoursFactorRange[0],
  });
  const high = computePrice({
    ...rest,
    materialsCost: baseMaterialsCost * materialsFactorRange[1],
    hours: baseHours * hoursFactorRange[1],
  });
  return { low, high };
}

export const DEFAULT_PRICING = {
  hourRate: 6000,
  wastePct: 10,
  overheadPct: 10,
  commissionPct: 0,
  marginPct: 40,
  includeTax: false,
  roundTo: 1000,
};
