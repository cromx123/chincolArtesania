// Estados de una solicitud de cotización generada por el bot de clientes.

export const QUOTE_STATUSES = [
  { id: "pendiente", name: "Pendiente" },
  { id: "revisada", name: "Revisada" },
  { id: "respondida", name: "Respondida" },
  { id: "descartada", name: "Descartada" },
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number]["id"];

export function isQuoteStatus(value: string): value is QuoteStatus {
  return QUOTE_STATUSES.some((s) => s.id === value);
}

export function quoteStatusName(id: string): string {
  return QUOTE_STATUSES.find((s) => s.id === id)?.name ?? id;
}
