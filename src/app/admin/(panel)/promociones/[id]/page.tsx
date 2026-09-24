import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { describePromo } from "@/domain/promo";
import { promoService } from "@/server/services/promo-service";
import { PageHeader } from "@/components/admin/PageHeader";
import { PromoForm } from "@/components/admin/PromoForm";

export const metadata: Metadata = { title: "Código de promoción" };

export default async function EditPromoPage({ params }: { params: Promise<{ id: string }> }) {
  const promo = await promoService.get((await params).id);
  if (!promo) notFound();

  return (
    <div className="a-page a-page--narrow">
      <PageHeader title={promo.code} subtitle={describePromo(promo)} back="/admin/promociones" />
      <PromoForm
        id={promo.id}
        initial={{
          code: promo.code,
          kind: promo.kind,
          value: promo.value,
          minTotal: promo.minTotal,
          expiresOn: promo.expiresOn ?? "",
          active: promo.active,
          note: promo.note ?? "",
        }}
      />
    </div>
  );
}
