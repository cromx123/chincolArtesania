import "server-only";
import { PrismaProductRepository } from "./repositories/prisma-product-repository";
import { LocalPhotoStorage } from "./storage/local-photo-storage";
import { createCatalogService } from "./services/catalog-service";

// Único lugar donde se eligen las implementaciones concretas.
// Para guardar fotos en la nube (Supabase Storage, S3…): otra clase que implemente PhotoStorage.
export const catalogService = createCatalogService(new PrismaProductRepository());
export const photoStorage = new LocalPhotoStorage();
