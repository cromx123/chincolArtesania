import "server-only";
import type { Product } from "@/domain/product";
import { db } from "../db";
import { toProduct } from "../mappers";
import type { ProductRepository } from "./product-repository";

export class PrismaProductRepository implements ProductRepository {
  async findPublished(): Promise<Product[]> {
    const rows = await db.product.findMany({ where: { published: true } });
    return rows.map(toProduct);
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const row = await db.product.findFirst({ where: { slug, published: true } });
    return row ? toProduct(row) : null;
  }

  async findById(id: string): Promise<Product | null> {
    const row = await db.product.findFirst({ where: { id, published: true } });
    return row ? toProduct(row) : null;
  }
}
