import "server-only";
import { discountedPrice } from "@/domain/product";
import { todayISO } from "@/lib/dates";
import { offerService } from "@/server/services/offer-service";
import { productAdminService } from "@/server/services/product-admin-service";
import type { SellableProduct } from "@/components/admin/SaleForm";

/**
 * Piezas para el formulario de ventas, por nombre. Con una promo vigente se propone el
 * precio con descuento (ella igual puede cambiarlo). `stockBack` suma al stock lo que una
 * venta que se está corrigiendo ya había descontado, porque al guardar vuelve al stock.
 */
export async function sellableProducts(stockBack: Map<string, number> = new Map()): Promise<SellableProduct[]> {
  const [products, offers] = await Promise.all([productAdminService.list(), offerService.activeByProduct(todayISO())]);
  return products
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: offers.has(p.id) ? discountedPrice(p.price, offers.get(p.id)!.percent) : p.price,
      stock: p.stock + (stockBack.get(p.id) ?? 0),
      madeToOrder: p.madeToOrder,
      image: p.images[0],
      hasRecipe: p.recipe.length > 0,
    }));
}
