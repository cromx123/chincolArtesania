import "server-only";
import { todayISO } from "@/lib/dates";
import { PrismaProductRepository } from "./repositories/prisma-product-repository";
import { LocalPhotoStorage } from "./storage/local-photo-storage";
import { createCatalogService } from "./services/catalog-service";
import { offerService } from "./services/offer-service";

// Único lugar donde se eligen las implementaciones concretas.
// Para guardar fotos en la nube (Supabase Storage, S3…): otra clase que implemente PhotoStorage.
export const catalogService = createCatalogService(new PrismaProductRepository(), () => offerService.activeByProduct(todayISO()));
export const photoStorage = new LocalPhotoStorage();
