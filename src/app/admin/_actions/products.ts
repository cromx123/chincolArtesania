"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/require-admin";
import { type ProductInput, type SaveResult, productAdminService } from "@/server/services/product-admin-service";
import { deletePhotos, savePhotos } from "@/server/services/photo-service";

export async function saveProductAction(id: string | null, input: ProductInput): Promise<SaveResult> {
  await requireAdmin();
  const result = await productAdminService.save(id, input);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function deleteProductAction(id: string) {
  await requireAdmin();
  const images = await productAdminService.remove(id);
  await deletePhotos(images);
  revalidatePath("/", "layout");
  redirect("/admin/productos?aviso=eliminado");
}

export async function adjustProductStockAction(id: string, delta: number): Promise<number> {
  await requireAdmin();
  const stock = await productAdminService.adjustStock(id, delta);
  revalidatePath("/", "layout");
  return stock;
}

export async function produceAction(id: string, units: number): Promise<{ missing: string[] }> {
  await requireAdmin();
  const result = await productAdminService.produce(id, units);
  revalidatePath("/", "layout");
  return result;
}

export async function uploadPhotosAction(formData: FormData): Promise<{ urls: string[]; rejected: string[] }> {
  await requireAdmin();
  const files = formData.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0);
  return savePhotos(files);
}
