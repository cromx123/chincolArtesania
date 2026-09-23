import "server-only";
import { type Material, isMaterialKind, isMaterialUnit } from "@/domain/material";
import { db } from "../db";
import { toMaterial } from "../mappers";

export interface MaterialInput {
  name: string;
  kind: string;
  unit: string;
  stock: number;
  minStock: number;
  unitCost: number;
  supplier: string;
}

export interface MaterialWithUse extends Material {
  /** Productos cuya receta usa este material. */
  usedIn: string[];
}

export interface Movement {
  id: string;
  materialName: string;
  unit: string;
  delta: number;
  reason: string;
  note: string | null;
  createdAt: Date;
}

export const materialService = {
  async list(): Promise<MaterialWithUse[]> {
    const rows = await db.material.findMany({
      include: { recipe: { include: { product: { select: { name: true } } } } },
      orderBy: [{ kind: "asc" }, { name: "asc" }],
    });
    return rows.map((r) => ({ ...toMaterial(r), usedIn: r.recipe.map((x) => x.product.name) }));
  },

  async all(): Promise<Material[]> {
    return (await db.material.findMany({ orderBy: { name: "asc" } })).map(toMaterial);
  },

  async save(id: string | null, input: MaterialInput): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!input.name.trim()) return { ok: false, error: "Escribe el nombre del material." };
    if (!isMaterialKind(input.kind) || !isMaterialUnit(input.unit)) return { ok: false, error: "Elige el tipo y la unidad." };
    const data = {
      name: input.name.trim(),
      kind: input.kind,
      unit: input.unit,
      minStock: Math.max(0, input.minStock || 0),
      unitCost: Math.max(0, Math.round(input.unitCost || 0)),
      supplier: input.supplier.trim() || null,
    };
    if (id) {
      await db.material.update({ where: { id }, data });
    } else {
      const stock = Math.max(0, input.stock || 0);
      await db.$transaction(async (tx) => {
        const m = await tx.material.create({ data: { ...data, stock } });
        if (stock > 0) await tx.materialMovement.create({ data: { materialId: m.id, delta: stock, reason: "ajuste", note: "Stock inicial" } });
      });
    }
    return { ok: true };
  },

  async remove(id: string) {
    await db.material.delete({ where: { id } });
  },

  /** "Compré más": suma al stock y, si dice cuánto pagó, actualiza el costo por unidad. */
  async purchase(id: string, quantity: number, totalPaid: number) {
    if (!(quantity > 0)) throw new Error("Cantidad inválida");
    await db.$transaction(async (tx) => {
      await tx.material.update({
        where: { id },
        data: { stock: { increment: quantity }, ...(totalPaid > 0 ? { unitCost: Math.round(totalPaid / quantity) } : {}) },
      });
      await tx.materialMovement.create({ data: { materialId: id, delta: quantity, reason: "compra" } });
    });
  },

  /** "Conté lo que tengo": fija el stock y guarda la diferencia en el historial. */
  async setStock(id: string, value: number) {
    const m = await db.material.findUniqueOrThrow({ where: { id } });
    const stock = Math.max(0, value);
    const delta = stock - m.stock;
    if (delta === 0) return;
    await db.$transaction([
      db.material.update({ where: { id }, data: { stock } }),
      db.materialMovement.create({ data: { materialId: id, delta, reason: "ajuste" } }),
    ]);
  },

  async recentMovements(limit = 8): Promise<Movement[]> {
    const rows = await db.materialMovement.findMany({ include: { material: true }, orderBy: { createdAt: "desc" }, take: limit });
    return rows.map((r) => ({
      id: r.id,
      materialName: r.material.name,
      unit: r.material.unit,
      delta: r.delta,
      reason: r.reason,
      note: r.note,
      createdAt: r.createdAt,
    }));
  },
};
