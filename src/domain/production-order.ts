// Encargos: piezas que hay que fabricar para alguien, con estado y fecha de entrega.
// Las fechas son días de Chile en texto ("2026-10-04"), igual que el calendario.

export const ORDER_STATUSES = [
  { id: "por-empezar", name: "Por empezar" },
  { id: "en-progreso", name: "En progreso" },
  { id: "finalizado", name: "Finalizado" },
  { id: "entregado", name: "Entregado" },
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number]["id"];

export interface ProductionOrder {
  id: string;
  title: string;
  productId: string | null;
  productName: string | null;
  quantity: number;
  customerName: string | null;
  customerContact: string | null;
  price: number;
  status: OrderStatus;
  dueDate: string;
  note: string | null;
  quoteRequestId: string | null;
}

export interface OrderInput {
  title: string;
  productId: string;
  quantity: number;
  customerName: string;
  customerContact: string;
  price: number;
  status: OrderStatus;
  dueDate: string;
  note: string;
  quoteRequestId: string;
}

export type OrderErrors = Partial<Record<keyof OrderInput, string>>;

export const EMPTY_ORDER: OrderInput = {
  title: "",
  productId: "",
  quantity: 1,
  customerName: "",
  customerContact: "",
  price: 0,
  status: "por-empezar",
  dueDate: "",
  note: "",
  quoteRequestId: "",
};

export function isOrderStatus(v: string): v is OrderStatus {
  return ORDER_STATUSES.some((s) => s.id === v);
}

export function orderStatusName(id: string): string {
  return ORDER_STATUSES.find((s) => s.id === id)?.name ?? id;
}

/** Sigue abierto: todavía no se entrega. */
export function isOpen(o: Pick<ProductionOrder, "status">): boolean {
  return o.status !== "entregado";
}

/** Se pasó la fecha de entrega y no se ha entregado. */
export function isOverdue(o: Pick<ProductionOrder, "status" | "dueDate">, today: string): boolean {
  return isOpen(o) && o.dueDate < today;
}

/** El estado que sigue, para el botón de avanzar (null si ya se entregó). */
export function nextStatus(status: OrderStatus): OrderStatus | null {
  const i = ORDER_STATUSES.findIndex((s) => s.id === status);
  return i >= 0 && i < ORDER_STATUSES.length - 1 ? ORDER_STATUSES[i + 1].id : null;
}
