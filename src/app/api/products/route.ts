import { NextResponse, type NextRequest } from "next/server";
import { parseFilters } from "@/domain/catalog-filters";
import { catalogService } from "@/server/container";

// GET /api/products?q=bolso&categoria=bolsos&disp=stock&orden=precio-asc
export async function GET(req: NextRequest) {
  const params: Record<string, string[]> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    (params[key] ??= []).push(value);
  });
  const products = await catalogService.search(parseFilters(params));
  return NextResponse.json({ total: products.length, products });
}
