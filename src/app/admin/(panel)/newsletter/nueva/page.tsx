import type { Metadata } from "next";
import { newsletterCampaignService } from "@/server/services/newsletter-campaign-service";
import { newsletterBaseUrl } from "@/server/services/newsletter-template";
import { NewsletterComposer } from "@/components/admin/NewsletterComposer";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata: Metadata = { title: "Nueva campaña" };

export default async function NewCampaignPage() {
  const [subscribers, products] = await Promise.all([newsletterCampaignService.subscribers(), newsletterCampaignService.discountableProducts()]);
  return (
    <div className="a-page a-page--narrow">
      <PageHeader title="Nueva campaña" subtitle="Cuéntale al asistente de qué se trata y revisa el correo antes de enviarlo" back="/admin/newsletter" />
      <NewsletterComposer
        id={null}
        initial={{
          subject: "",
          body: "",
          eventAt: "",
          aiContext: "",
          productsText: "",
          promoText: "",
          ctaLabel: "",
          ctaUrl: "",
          scheduledAt: "",
          promoFrom: "",
          promoUntil: "",
          discounts: [],
        }}
        subscribers={subscribers.length}
        subscriberEmails={subscribers.map((s) => s.email)}
        products={products}
        storeUrl={newsletterBaseUrl()}
      />
    </div>
  );
}
