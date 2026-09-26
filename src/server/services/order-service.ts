import "server-only";
import type { Prisma } from "@prisma/client";
import { isISODate } from "@/domain/event";
import { type OrderErrors, type OrderInput, type OrderStatus, type ProductionOrder, isOrderStatus } from "@/domain/production-order";
import { db } from "../db";

export type SaveOrderResult = { ok: true; id: string } | { ok: false; errors: OrderErrors };

const include = { product: { select: { name: true } } } as const;
type OrderRow = Prisma.ProductionOrderGetPayload<{ include: typeof include }>;

function toOrder(row: OrderRow): ProductionOrder {
  return {
    id: row.id,
    title: row.title,
    productId: row.productId,
    productName: row.product?.name ?? null,
    quantity: row.quantity,
    customerName: row.customerName,
    customerContact: row.customerContact,
    price: row.price,
    status: isOrderStatus(row.status) ? row.status : "por-empezar",
    dueDate: row.dueDate,
    note: row.note,
    quoteRequestId: row.quoteRequestId,
  };
}

function validate(input: OrderInput): OrderErrors {
  const errors: OrderErrors = {};
  if (!input.title.trim()) errors.title = "Escribe qué hay que hacer.";
  if (!Number.isInteger(input.quantity) || input.quantity < 1) errors.quantity = "Tiene que ser 1 o más.";
  if (!Number.isInteger(input.price) || input.price < 0) errors.price = "Revisa el valor.";
  if (!isOrderStatus(input.status)) errors.status = "Elige en qué va.";
  if (!isISODate(input.dueDate)) errors.dueDate = "Elige la fecha de entrega.";
  return errors;
}

export const orderService = {
  async get(id: string): Promise<ProductionOrder | null> {
    const row = await db.productionOrder.findUnique({ where: { id }, include });
    return row ? toOrder(row) : null;
  },

  /** Todos, ordenados por fecha de entrega. */
  async list(): Promise<ProductionOrder[]> {
    const rows = await db.productionOrder.findMany({ include, orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }] });
    return rows.map(toOrder);
  },

  /** Entregas que caen en el rango [from, to] (inclusive), para el calendario. */
  async dueBetween(from: string, to: string): Promise<ProductionOrder[]> {
    const rows = await db.productionOrder.findMany({ where: { dueDate: { gte: from, lte: to } }, include, orderBy: { dueDate: "asc" } });
    return rows.map(toOrder);
  },

  /** Sin entregar y con fecha hasta `until` (incluye los atrasados). */
  async dueSoon(until: string): Promise<ProductionOrder[]> {
    const rows = await db.productionOrder.findMany({
      where: { status: { not: "entregado" }, dueDate: { lte: until } },
      include,
      orderBy: { dueDate: "asc" },
    });
    return rows.map(toOrder);
  },

  async byQuote(quoteRequestId: string): Promise<ProductionOrder | null> {
    const row = await db.productionOrder.findUnique({ where: { quoteRequestId }, include });
    return row ? toOrder(row) : null;
  },

  async save(id: string | null, input: OrderInput): Promise<SaveOrderResult> {
    const errors = validate(input);
    if (Object.keys(errors).length) return { ok: false, errors };

    const data = {
      title: input.title.trim(),
      productId: input.productId || null,
      quantity: input.quantity,
      customerName: input.customerName.trim() || null,
      customerContact: input.customerContact.trim() || null,
      price: input.price,
      status: input.status,
      dueDate: input.dueDate,
      note: input.note.trim() || null,
    };
    // La cotización de origen solo se fija al crear; editar el encargo no la cambia.
    const row = id
      ? await db.productionOrder.update({ where: { id }, data })
      : await db.productionOrder.create({ data: { ...data, quoteRequestId: input.quoteRequestId || null } });
    return { ok: true, id: row.id };
  },

  async setStatus(id: string, status: OrderStatus) {
    await db.productionOrder.update({ where: { id }, data: { status } });
  },

  async remove(id: string) {
    await db.productionOrder.delete({ where: { id } });
  },
};
