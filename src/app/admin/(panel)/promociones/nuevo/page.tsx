import type { Metadata } from "next";
import { EMPTY_PROMO } from "@/domain/promo";
import { PageHeader } from "@/components/admin/PageHeader";
import { PromoForm } from "@/components/admin/PromoForm";

export const metadata: Metadata = { title: "Nuevo código" };

export default function NewPromoPage() {
  return (
    <div className="a-page a-page--narrow">
      <PageHeader title="Nuevo código de promoción" back="/admin/promociones" />
      <PromoForm id={null} initial={EMPTY_PROMO} />
    </div>
  );
}
