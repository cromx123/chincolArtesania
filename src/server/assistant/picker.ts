import "server-only";
import type { AssistantTask, PickerProduct } from "@/domain/assistant";
import { productAdminService } from "../services/product-admin-service";

/** Productos para el botón "Elegir producto" (solo en "Describir un producto"). */
export async function pickerProductsFor(task: AssistantTask): Promise<PickerProduct[]> {
  if (task !== "descripcion") return [];
  const products = await productAdminService.list();
  return products
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .map((p) => ({ id: p.id, name: p.name, category: p.category, image: p.images[0], description: p.description }));
}
