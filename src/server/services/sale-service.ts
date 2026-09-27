import "server-only";
import type { Prisma } from "@prisma/client";
import { type SaleInput, type SaleLineInput, cleanFairName, isChannel, isPayment, lineTotal, saleTotal } from "@/domain/sale";
import { middayOf, monthRange, todayISO } from "@/lib/dates";
import { db } from "../db";

export interface SaleSummary {
  id: string;
  soldAt: Date;
  channel: string;
  fairName: string | null;
  payment: string;
  paid: boolean;
  customer: string | null;
  customerId: string | null;
  note: string | null;
  total: number;
  discountStock: boolean;
  pieces: number;
  items: { productId: string | null; name: string; quantity: number; unitPrice: number; discount: number; fromStock: number }[];
}

type SaveResult = { ok: true; id: string; total: number } | { ok: false; error: string };

type Tx = Prisma.TransactionClient;
const withRecipe = { recipe: { include: { material: true } } } as const;
type ProductWithRecipe = Prisma.ProductGetPayload<{ include: typeof withRecipe }>;

/** Revisa la venta y junta lo que hace falta para guardarla. */
async function prepare(input: SaleInput) {
  const lines = input.lines.filter((l) => l.quantity > 0);
  if (!lines.length) return { ok: false as const, error: "Agrega al menos una pieza." };
  if (!isChannel(input.channel)) return { ok: false as const, error: "Elige dónde vendiste." };
  if (!isPayment(input.payment)) return { ok: false as const, error: "Elige cómo te pagaron." };
  if (lines.some((l) => !Number.isInteger(l.quantity) || l.unitPrice < 0)) return { ok: false as const, error: "Revisa las cantidades y precios." };
  if (lines.some((l) => !Number.isInteger(l.discount ?? 0) || lineTotal(l) < 0)) {
    return { ok: false as const, error: "El descuento no puede ser mayor que el precio." };
  }

  const products = await db.product.findMany({ where: { id: { in: lines.map((l) => l.productId) } }, include: withRecipe });
  if (products.length !== new Set(lines.map((l) => l.productId)).size) return { ok: false as const, error: "Una de las piezas ya no existe." };

  let fairName = input.channel === "feria" ? cleanFairName(input.fairName) : null;
  if (fairName) {
    const known = await saleService.recentFairNames(100);
    fairName = known.find((n) => n.toLowerCase() === fairName!.toLowerCase()) ?? fairName;
  }

  const client = input.customerId ? await db.customer.findUnique({ where: { id: input.customerId }, select: { id: true, name: true } }) : null;

  return {
    ok: true as const,
    lines,
    products,
    total: saleTotal(lines),
    fields: {
      channel: input.channel,
      fairName,
      payment: input.payment,
      paid: input.payment !== "pendiente",
      customer: input.customer?.trim() || client?.name || null,
      customerId: client?.id ?? null,
      note: input.note?.trim() || null,
      total: saleTotal(lines),
      discountStock: input.discountStock,
    },
  };
}

/**
 * Anota las piezas de la venta. Si `discountStock`: primero salen piezas ya hechas;
 * las que faltan se descuentan de los materiales.
 */
async function applyLines(tx: Tx, saleId: string, lines: SaleLineInput[], products: ProductWithRecipe[], discountStock: boolean) {
  for (const line of lines) {
    const product = products.find((p) => p.id === line.productId)!;
    let fromStock = 0;
    if (discountStock) {
      const current = await tx.product.findUniqueOrThrow({ where: { id: product.id }, select: { stock: true } });
      fromStock = Math.min(current.stock, line.quantity);
      if (fromStock > 0) await tx.product.update({ where: { id: product.id }, data: { stock: { decrement: fromStock } } });

      const toMake = line.quantity - fromStock;
      for (const r of toMake > 0 ? product.recipe : []) {
        const m = await tx.material.findUniqueOrThrow({ where: { id: r.materialId }, select: { stock: true } });
        const used = Math.min(m.stock, r.quantity * toMake);
        if (used <= 0) continue;
        await tx.material.update({ where: { id: r.materialId }, data: { stock: { decrement: used } } });
        await tx.materialMovement.create({
          data: { materialId: r.materialId, delta: -used, reason: "venta", saleId, productId: product.id, note: `${toMake} × ${product.name}` },
        });
      }
    }
    await tx.saleItem.create({
      data: { saleId, productId: product.id, productName: product.name, unitPrice: line.unitPrice, quantity: line.quantity, discount: line.discount ?? 0, fromStock },
    });
  }
}

type SaleWithStock = Prisma.SaleGetPayload<{ include: { items: true; movements: true } }>;

/** Devuelve al stock las piezas y materiales que la venta había descontado. */
async function revertStock(tx: Tx, sale: SaleWithStock) {
  for (const item of sale.items) {
    if (item.productId && item.fromStock > 0) {
      await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.fromStock } } }).catch(() => {});
    }
  }
  for (const mv of sale.movements) {
    await tx.material.update({ where: { id: mv.materialId }, data: { stock: { decrement: mv.delta } } });
  }
  await tx.materialMovement.deleteMany({ where: { saleId: sale.id } });
}

const include = { items: true } as const;

type SaleRow = Prisma.SaleGetPayload<{ include: typeof include }>;

function toSummary(s: SaleRow): SaleSummary {
  return {
    id: s.id,
    soldAt: s.soldAt,
    channel: s.channel,
    fairName: s.fairName,
    payment: s.payment,
    paid: s.paid,
    customer: s.customer,
    customerId: s.customerId,
    note: s.note,
    total: s.total,
    discountStock: s.discountStock,
    pieces: s.items.reduce((n, i) => n + i.quantity, 0),
    items: s.items.map((i) => ({
      productId: i.productId,
      name: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount,
      fromStock: i.fromStock,
    })),
  };
}

export const saleService = {
  /** Registra una venta y descuenta del stock si corresponde (ver applyLines). */
  async register(input: SaleInput): Promise<SaveResult> {
    const p = await prepare(input);
    if (!p.ok) return p;
    const sale = await db.$transaction(async (tx) => {
      const created = await tx.sale.create({ data: { ...p.fields, soldAt: input.date ? middayOf(input.date) : new Date() } });
      await applyLines(tx, created.id, p.lines, p.products, input.discountStock);
      return created;
    });
    return { ok: true, id: sale.id, total: p.total };
  },

  /**
   * Corrige una venta ya registrada. Es lo mismo que borrarla y volver a registrarla,
   * pero en un solo paso: se devuelve al stock lo que la venta original descontó y se
   * descuenta lo de la venta corregida. Si no se cambia el día, conserva su hora original.
   */
  async update(id: string, input: SaleInput): Promise<SaveResult> {
    const existing = await db.sale.findUnique({ where: { id }, include: { items: true, movements: true } });
    if (!existing) return { ok: false, error: "No encontramos esta venta." };
    if (existing.items.some((i) => !i.productId)) {
      return { ok: false, error: "Esta venta tiene una pieza que ya no existe en tus productos, así que no se puede editar. Bórrala y regístrala de nuevo." };
    }
    const p = await prepare(input);
    if (!p.ok) return p;

    const sameDay = !input.date || input.date === todayISO(existing.soldAt);
    await db.$transaction(async (tx) => {
      await revertStock(tx, existing);
      await tx.saleItem.deleteMany({ where: { saleId: id } });
      await tx.sale.update({ where: { id }, data: { ...p.fields, soldAt: sameDay ? existing.soldAt : middayOf(input.date!) } });
      await applyLines(tx, id, p.lines, p.products, input.discountStock);
    });
    return { ok: true, id, total: p.total };
  },

  /** Borra la venta y devuelve al stock lo que se había descontado. */
  async remove(id: string) {
    const sale = await db.sale.findUnique({ where: { id }, include: { items: true, movements: true } });
    if (!sale) return;
    await db.$transaction(async (tx) => {
      await revertStock(tx, sale);
      await tx.sale.delete({ where: { id } });
    });
  },

  async markPaid(id: string, payment: string) {
    if (!isPayment(payment) || payment === "pendiente") throw new Error("Medio de pago inválido");
    await db.sale.update({ where: { id }, data: { paid: true, payment } });
  },

  async get(id: string): Promise<SaleSummary | null> {
    const s = await db.sale.findUnique({ where: { id }, include });
    return s ? toSummary(s) : null;
  },

  async byMonth(month: string): Promise<SaleSummary[]> {
    const { start, end } = monthRange(month);
    const rows = await db.sale.findMany({ where: { soldAt: { gte: start, lt: end } }, include, orderBy: { soldAt: "desc" } });
    return rows.map(toSummary);
  },

  async since(days: number): Promise<SaleSummary[]> {
    const rows = await db.sale.findMany({ where: { soldAt: { gte: new Date(Date.now() - days * 86_400_000) } }, include });
    return rows.map(toSummary);
  },

  async recent(limit = 5): Promise<SaleSummary[]> {
    const rows = await db.sale.findMany({ include, orderBy: { soldAt: "desc" }, take: limit });
    return rows.map(toSummary);
  },

  /** Ferias donde ya vendió, la más reciente primero (para elegirlas con un toque). */
  async byCustomer(customerId: string): Promise<SaleSummary[]> {
    const rows = await db.sale.findMany({ where: { customerId }, include, orderBy: { soldAt: "desc" } });
    return rows.map(toSummary);
  },

  async recentFairNames(limit = 6): Promise<string[]> {
    const rows = await db.sale.findMany({
      where: { channel: "feria", fairName: { not: null } },
      select: { fairName: true },
      orderBy: { soldAt: "desc" },
      take: 200,
    });
    const seen = new Map<string, string>(); // sin distinguir mayúsculas
    for (const r of rows) {
      const key = r.fairName!.toLowerCase();
      if (!seen.has(key)) seen.set(key, r.fairName!);
    }
    return [...seen.values()].slice(0, limit);
  },

  async pending(): Promise<SaleSummary[]> {
    const rows = await db.sale.findMany({ where: { paid: false }, include, orderBy: { soldAt: "asc" } });
    return rows.map(toSummary);
  },
};
