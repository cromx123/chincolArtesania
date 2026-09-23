import "server-only";
import type { Prisma } from "@prisma/client";
import { type SaleInput, cleanFairName, isChannel, isPayment, lineTotal, saleTotal } from "@/domain/sale";
import { middayOf, monthRange } from "@/lib/dates";
import { db } from "../db";

export interface SaleSummary {
  id: string;
  soldAt: Date;
  channel: string;
  fairName: string | null;
  payment: string;
  paid: boolean;
  customer: string | null;
  note: string | null;
  total: number;
  pieces: number;
  items: { productId: string | null; name: string; quantity: number; unitPrice: number; discount: number }[];
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
    note: s.note,
    total: s.total,
    pieces: s.items.reduce((n, i) => n + i.quantity, 0),
    items: s.items.map((i) => ({ productId: i.productId, name: i.productName, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount })),
  };
}

export const saleService = {
  /**
   * Registra una venta. Si "descontar del stock" está marcado:
   * primero salen piezas ya hechas; las que faltan se descuentan de los materiales.
   */
  async register(input: SaleInput): Promise<{ ok: true; id: string; total: number } | { ok: false; error: string }> {
    const lines = input.lines.filter((l) => l.quantity > 0);
    if (!lines.length) return { ok: false, error: "Agrega al menos una pieza." };
    if (!isChannel(input.channel)) return { ok: false, error: "Elige dónde vendiste." };
    if (!isPayment(input.payment)) return { ok: false, error: "Elige cómo te pagaron." };
    if (lines.some((l) => !Number.isInteger(l.quantity) || l.unitPrice < 0)) return { ok: false, error: "Revisa las cantidades y precios." };
    if (lines.some((l) => !Number.isInteger(l.discount ?? 0) || lineTotal(l) < 0)) {
      return { ok: false, error: "El descuento no puede ser mayor que el precio." };
    }

    const products = await db.product.findMany({
      where: { id: { in: lines.map((l) => l.productId) } },
      include: { recipe: { include: { material: true } } },
    });
    if (products.length !== new Set(lines.map((l) => l.productId)).size) return { ok: false, error: "Una de las piezas ya no existe." };

    let fairName = input.channel === "feria" ? cleanFairName(input.fairName) : null;
    if (fairName) {
      const known = await this.recentFairNames(100);
      fairName = known.find((n) => n.toLowerCase() === fairName!.toLowerCase()) ?? fairName;
    }

    const total = saleTotal(lines);
    const sale = await db.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          soldAt: input.date ? middayOf(input.date) : new Date(),
          channel: input.channel,
          fairName,
          payment: input.payment,
          paid: input.payment !== "pendiente",
          customer: input.customer?.trim() || null,
          note: input.note?.trim() || null,
          total,
          discountStock: input.discountStock,
        },
      });

      for (const line of lines) {
        const product = products.find((p) => p.id === line.productId)!;
        let fromStock = 0;
        if (input.discountStock) {
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
              data: { materialId: r.materialId, delta: -used, reason: "venta", saleId: created.id, productId: product.id, note: `${toMake} × ${product.name}` },
            });
          }
        }
        await tx.saleItem.create({
          data: { saleId: created.id, productId: product.id, productName: product.name, unitPrice: line.unitPrice, quantity: line.quantity, discount: line.discount ?? 0, fromStock },
        });
      }
      return created;
    });

    return { ok: true, id: sale.id, total };
  },

  /** Borra la venta y devuelve al stock lo que se había descontado. */
  async remove(id: string) {
    const sale = await db.sale.findUnique({ where: { id }, include: { items: true, movements: true } });
    if (!sale) return;
    await db.$transaction(async (tx) => {
      for (const item of sale.items) {
        if (item.productId && item.fromStock > 0) {
          await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.fromStock } } }).catch(() => {});
        }
      }
      for (const mv of sale.movements) {
        await tx.material.update({ where: { id: mv.materialId }, data: { stock: { decrement: mv.delta } } });
      }
      await tx.materialMovement.deleteMany({ where: { saleId: id } });
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
