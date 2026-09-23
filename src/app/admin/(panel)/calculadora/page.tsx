import type { Metadata } from "next";
import { recipeCost } from "@/domain/production";
import { productAdminService } from "@/server/services/product-admin-service";
import { settingsService } from "@/server/services/settings-service";
import { PageHeader } from "@/components/admin/PageHeader";
import { type PricedProduct, PricingCalculator } from "@/components/admin/PricingCalculator";

export const metadata: Metadata = { title: "Calcular precio" };

export default async function CalculatorPage({ searchParams }: { searchParams: Promise<{ producto?: string }> }) {
  const { producto } = await searchParams;
  const [products, settings] = await Promise.all([productAdminService.list(), settingsService.pricing()]);

  const priced: PricedProduct[] = products
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      materialsCost: recipeCost(p.recipe),
      lines: p.recipe.map((l) => ({
        name: l.material.name,
        quantity: l.quantity,
        unit: l.material.unit,
        cost: Math.round(l.quantity * l.material.unitCost),
      })),
    }));

  return (
    <div className="a-page">
      <PageHeader title="Calcular precio" subtitle="Lo que te cuesta hacer la pieza, más la ganancia que quieres" />
      <PricingCalculator products={priced} settings={settings} initialProductId={producto} />
    </div>
  );
}
