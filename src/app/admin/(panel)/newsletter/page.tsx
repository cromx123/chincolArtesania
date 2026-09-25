import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/PageHeader";
import { NewsletterCampaignForm } from "@/components/admin/NewsletterCampaignForm";
import { newsletterCampaignService } from "@/server/services/newsletter-campaign-service";

export const metadata: Metadata = { title: "Newsletter" };

export default async function NewsletterPage() {
  const [campaigns, subscribers, subscriberRows] = await Promise.all([newsletterCampaignService.list(), newsletterCampaignService.subscriberCount(), newsletterCampaignService.subscribers()]);
  return <div className="a-page a-page--narrow"><PageHeader title="Newsletter" subtitle="Prepara novedades, promociones y avisos para tus suscriptores." /><NewsletterCampaignForm campaigns={campaigns} subscribers={subscribers} subscriberRows={subscriberRows} /></div>;
}
