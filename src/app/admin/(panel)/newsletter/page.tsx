import type { Metadata } from "next";
import Link from "next/link";
import { campaignStatusName } from "@/domain/newsletter";
import { formatChileDateTime } from "@/lib/dates";
import { newsletterCampaignService } from "@/server/services/newsletter-campaign-service";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { Notice } from "@/components/admin/Notice";
import { PageHeader } from "@/components/admin/PageHeader";
import { PlusIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Newsletter" };

const NOTICES: Record<string, string> = {
  enviando: "Se está enviando. Puedes seguir usando el sistema mientras tanto.",
  programada: "Campaña programada. Se enviará sola a la hora elegida.",
  eliminada: "Campaña eliminada.",
};

const STATUS_PILL: Record<string, string> = {
  borrador: "a-pill--plain",
  programada: "a-pill--info",
  enviando: "a-pill--warn",
  enviada: "a-pill--ok",
  error: "a-pill--bad",
};

type Campaign = Awaited<ReturnType<typeof newsletterCampaignService.list>>[number];

function campaignMeta(c: Campaign): string {
  if (c.status === "enviada") return `Enviada el ${c.sentAt ? formatChileDateTime(c.sentAt) : ""} · ${c.sentCount} enviados${c.failedCount ? ` · ${c.failedCount} con error` : ""}`;
  if (c.status === "programada" && c.scheduledAt) return `Sale el ${formatChileDateTime(c.scheduledAt)}`;
  if (c.status === "enviando") return "Saliendo ahora…";
  return `Editada el ${formatChileDateTime(c.updatedAt)}`;
}

export default async function NewsletterPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const { aviso } = await searchParams;
  const [campaigns, subscribers, history] = await Promise.all([
    newsletterCampaignService.list(),
    newsletterCampaignService.subscriberCount(),
    newsletterCampaignService.subscriberHistory(),
  ]);
  const sending = campaigns.some((c) => c.status === "enviando");

  return (
    <div className="a-page a-page--narrow">
      {sending && <AutoRefresh seconds={5} />}
      <Notice message={aviso ? (NOTICES[aviso] ?? null) : null} />
      <PageHeader
        title="Newsletter"
        subtitle={`Correos para tus suscriptores · ${subscribers === 1 ? "1 suscriptor" : `${subscribers} suscriptores`}`}
        actions={
          <Link href="/admin/newsletter/nueva" className="a-btn a-btn--primary">
            <PlusIcon /> Nueva campaña
          </Link>
        }
      />

      {campaigns.length === 0 ? (
        <div className="a-empty">
          <p>Todavía no hay campañas. Escribe el asunto, cuéntale al asistente qué quieres decir y él te arma el correo.</p>
          <Link href="/admin/newsletter/nueva" className="a-btn a-btn--primary">
            Crear la primera
          </Link>
        </div>
      ) : (
        <div className="a-rows a-card a-card--flush">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/admin/newsletter/${c.id}`} className="a-row">
              <span className="a-row__main">
                <span className="a-row__title">{c.subject}</span>
                <span className="a-row__meta">{campaignMeta(c)}</span>
                {c.lastError && <span className="a-row__meta a-error">{c.lastError}</span>}
              </span>
              <span className="a-row__end">
                <span className={`a-pill ${STATUS_PILL[c.status] ?? "a-pill--plain"}`}>{campaignStatusName(c.status)}</span>
              </span>
            </Link>
          ))}
        </div>
      )}

      <section className="a-card">
        <h2 className="a-card__title">Lista de correos</h2>
        <p className="a-hint">Se conservan las fechas de alta y baja para mantener el historial de consentimiento.</p>
        {history.length === 0 ? (
          <p className="a-muted">Aún no hay correos registrados.</p>
        ) : (
          <div className="a-rows">
            {history.map((s) => (
              <div key={s.id} className="a-row">
                <span className="a-row__main">
                  <span className="a-row__title">{s.email}</span>
                  <span className="a-row__meta">
                    Suscripción: {s.subscribedAt.toLocaleDateString("es-CL")}
                    {s.unsubscribedAt ? ` · Baja: ${s.unsubscribedAt.toLocaleDateString("es-CL")}` : ""}
                  </span>
                </span>
                <span className={`a-pill ${s.status === "suscrito" ? "a-pill--ok" : "a-pill--plain"}`}>{s.status === "suscrito" ? "Suscrito" : "Dado de baja"}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
