const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const clpCents = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatPrice(value: number): string {
  return clp.format(value);
}

/** Costo por unidad: con decimales si es menor a $100 (ej. "$0,55" por cm de hilo). */
export function formatUnitPrice(value: number): string {
  return value < 100 && !Number.isInteger(value) ? clpCents.format(value) : clp.format(value);
}
