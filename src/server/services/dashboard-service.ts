import "server-only";
import { needsRestock } from "@/domain/material";
import { daysBetween } from "@/domain/event";
import { currentMonth, todayISO } from "@/lib/dates";
import { eventService } from "./event-service";
import { materialService } from "./material-service";
import { productAdminService } from "./product-admin-service";
import { saleService } from "./sale-service";

/** Lo que ve al entrar: cuánto vendió y qué necesita atención. */
export async function getDashboard() {
  const month = currentMonth();
  const today = todayISO();
  const inAWeek = todayISO(new Date(Date.now() + 7 * 86_400_000));
  const [sales, pending, products, materials, recent, closing] = await Promise.all([
    saleService.byMonth(month),
    saleService.pending(),
    productAdminService.list(),
    materialService.list(),
    saleService.recent(4),
    eventService.closingSoon(today, inAWeek),
  ]);

  const lowProducts = products.filter((p) => p.published && !p.madeToOrder && p.stock <= p.lowStockAlert);
  const lowMaterials = materials.filter(needsRestock).sort((a, b) => a.stock / (a.minStock || 1) - b.stock / (b.minStock || 1));

  return {
    month,
    monthTotal: sales.reduce((s, x) => s + x.total, 0),
    monthCount: sales.length,
    monthPieces: sales.reduce((s, x) => s + x.pieces, 0),
    pending,
    lowProducts,
    lowMaterials,
    recent,
    closing: closing.map((e) => ({ id: e.id, name: e.name, daysLeft: daysBetween(today, e.applyBy!) })),
  };
}
