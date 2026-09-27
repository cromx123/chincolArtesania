import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatDay } from "@/domain/event";
import { campaignStatusName, isLocked } from "@/domain/newsletter";
import { discountedPrice } from "@/domain/product";
import { formatChileDateTime, toChileLocalInput, todayISO } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { endPromoAction } from "@/app/admin/_actions/newsletter";
import { newsletterCampaignService } from "@/server/services/newsletter-campaign-service";
import { newsletterBaseUrl } from "@/server/services/newsletter-template";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { NewsletterComposer } from "@/components/admin/NewsletterComposer";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata: Metadata = { title: "Campaña" };

type Campaign = NonNullable<Awaited<ReturnType<typeof newsletterCampaignService.get>>>;

/** Piezas con descuento de una campaña ya enviada, con opción de terminar la promo antes. */
function PromoSummary({ campaign }: { campaign: Campaign }) {
  if (campaign.discounts.length === 0) return null;
  const today = todayISO();
  const running = Boolean(campaign.promoUntil && campaign.promoUntil >= today);
  const period =
    campaign.promoFrom && campaign.promoUntil ? `Del ${formatDay(campaign.promoFrom, false)} al ${formatDay(campaign.promoUntil, false)}` : "Sin fechas";
  return (
    <section className="a-card">
      <h2 className="a-card__title">Piezas con descuento</h2>
      <p className="a-hint">
        {period} · {running ? (campaign.promoFrom && campaign.promoFrom > today ? "todavía no empieza" : "vigente en la tienda") : "ya terminó"}
      </p>
      <ul className="nl-discounts__list">
        {campaign.discounts.map((d) => (
          <li key={d.id}>
            <span className="nl-discounts__name">
              <strong>{d.product.name}</strong>
              <span className="a-muted a-small">
                <s>{formatPrice(d.product.price)}</s> → <strong className="nl-discounts__now">{formatPrice(discountedPrice(d.product.price, d.percent))}</strong>
              </span>
            </span>
            <span className="nl-percent">{d.percent}%</span>
          </li>
        ))}
      </ul>
      {running && (
        <ConfirmButton
          label="Terminar la promoción ahora"
          confirmLabel="Sí, terminarla"
          warning="Las piezas vuelven a su precio normal en la tienda desde ya. El correo enviado no cambia."
          onConfirm={endPromoAction.bind(null, campaign.id)}
        />
      )}
    </section>
  );
}

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const campaign = await newsletterCampaignService.get((await params).id);
  if (!campaign) notFound();

  if (isLocked(campaign.status)) {
    const sending = campaign.status === "enviando";
    const [done, total] = sending
      ? await Promise.all([newsletterCampaignService.deliveredCount(campaign.id), newsletterCampaignService.subscriberCount()])
      : [0, 0];
    return (
      <div className="a-page a-page--narrow">
        {sending && <AutoRefresh seconds={5} />}
        <PageHeader
          title={campaign.subject}
          subtitle={
            sending
              ? `Enviando… ${done} de ${Math.max(total, done)} · esta página se actualiza sola`
              : `${campaignStatusName(campaign.status)}${campaign.sentAt ? ` el ${formatChileDateTime(campaign.sentAt)}` : ""} · ${campaign.sentCount} enviados${campaign.failedCount ? ` · ${campaign.failedCount} con error` : ""}`
          }
          back="/admin/newsletter"
        />
        {campaign.lastError && <p className="a-error">{campaign.lastError}</p>}
        <PromoSummary campaign={campaign} />
        <section className="nl-sheet">
          <div className="nl-sheet__head">
            <span className="nl-sheet__label">Asunto</span>
            <span className="nl-sheet__subject">{campaign.subject}</span>
          </div>
          <div className="nl-sheet__text">{campaign.body}</div>
        </section>
      </div>
    );
  }

  const [subscribers, products] = await Promise.all([newsletterCampaignService.subscribers(), newsletterCampaignService.discountableProducts()]);
  const when =
    campaign.status === "programada" && campaign.scheduledAt
      ? `Programada para el ${formatChileDateTime(campaign.scheduledAt)}`
      : campaign.status === "error"
        ? "No se pudo enviar"
        : "Borrador";

  return (
    <div className="a-page a-page--narrow">
      <PageHeader title={campaign.subject} subtitle={when} back="/admin/newsletter" />
      {campaign.lastError && <p className="a-error">{campaign.lastError}</p>}
      <NewsletterComposer
        id={campaign.id}
        initial={{
          subject: campaign.subject,
          body: campaign.body,
          eventAt: campaign.eventAt ? toChileLocalInput(campaign.eventAt) : "",
          aiContext: campaign.aiContext ?? "",
          productsText: campaign.productsText ?? "",
          promoText: campaign.promoText ?? "",
          ctaLabel: campaign.ctaLabel ?? "",
          ctaUrl: campaign.ctaUrl ?? "",
          scheduledAt: campaign.scheduledAt ? toChileLocalInput(campaign.scheduledAt) : "",
          promoFrom: campaign.promoFrom ?? "",
          promoUntil: campaign.promoUntil ?? "",
          discounts: campaign.discounts.map((d) => ({ productId: d.productId, percent: d.percent })),
        }}
        subscribers={subscribers.length}
        subscriberEmails={subscribers.map((s) => s.email)}
        products={products}
        storeUrl={newsletterBaseUrl()}
      />
    </div>
  );
}
