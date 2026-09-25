import "server-only";
import nodemailer from "nodemailer";
import { db } from "../db";
import { newsletterBaseUrl, renderNewsletterEmail } from "./newsletter-template";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function gmailTransport() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) throw new Error("Configura GMAIL_USER y GMAIL_APP_PASSWORD en .env.");
  return { user, transporter: nodemailer.createTransport({ service: "gmail", auth: { user, pass } }) };
}

export type CampaignInput = { subject: string; body: string; productsText: string; promoText: string; ctaLabel: string; ctaUrl: string; scheduledAt: string };

export const newsletterCampaignService = {
  async list() {
    return db.newsletterCampaign.findMany({ orderBy: [{ scheduledAt: "asc" }, { updatedAt: "desc" }] });
  },
  async subscriberCount() {
    return db.newsletterSubscriber.count({ where: { status: "suscrito" } });
  },
  async subscribers() {
    return db.newsletterSubscriber.findMany({ where: { status: "suscrito" }, select: { id: true, email: true }, orderBy: { subscribedAt: "desc" } });
  },
  async subscriberHistory() {
    return db.newsletterSubscriber.findMany({ select: { id: true, email: true, status: true, subscribedAt: true, unsubscribedAt: true }, orderBy: { createdAt: "desc" } });
  },
  async sendTest(input: { subject: string; body: string; productsText?: string; promoText?: string; ctaLabel?: string; ctaUrl?: string; recipient: string }) {
    const subject = input.subject.trim().slice(0, 180);
    const body = input.body.trim().slice(0, 12000);
    const recipient = input.recipient.trim().toLowerCase();
    if (!subject || (!body && !input.productsText?.trim() && !input.promoText?.trim())) return { ok: false as const, error: "Completa el asunto y al menos un contenido para el correo." };
    if (recipient.length > 254 || !EMAIL_RE.test(recipient)) return { ok: false as const, error: "Escribe una dirección de correo válida." };
    if (input.ctaUrl && !/^https?:\/\//i.test(input.ctaUrl.trim())) return { ok: false as const, error: "El enlace del botón debe comenzar con https:// o http://." };
    try {
      const { user, transporter } = gmailTransport();
      const subscriber = await db.newsletterSubscriber.findUnique({ where: { email: recipient }, select: { unsubscribeToken: true } });
      const unsubscribeUrl = subscriber ? `${newsletterBaseUrl()}/newsletter/unsubscribe/${subscriber.unsubscribeToken}` : null;
      const text = [body, input.promoText?.trim(), input.ctaLabel?.trim() && input.ctaUrl?.trim() ? `${input.ctaLabel.trim()}: ${input.ctaUrl.trim()}` : null, `Chincol Artesanía · ${newsletterBaseUrl()}`, process.env.NEXT_PUBLIC_EMAIL?.trim() ? `Contacto: ${process.env.NEXT_PUBLIC_EMAIL.trim()}` : null, unsubscribeUrl ? `Darte de baja: ${unsubscribeUrl}` : "Correo de prueba del newsletter."].filter(Boolean).join("\n\n");
      await transporter.sendMail({
        from: { name: process.env.NEWSLETTER_FROM_NAME?.trim() || "Chincol Artesanía", address: user },
        to: recipient,
        subject: `[Prueba] ${subject}`,
        text,
        html: renderNewsletterEmail({ body, productsText: input.productsText, promoText: input.promoText, ctaLabel: input.ctaLabel, ctaUrl: input.ctaUrl, unsubscribeUrl }),
      });
      return { ok: true as const };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Error de conexión con Gmail.";
      return { ok: false as const, error: `No se pudo enviar. Revisa la configuración de Gmail. (${reason.slice(0, 180)})` };
    }
  },
  async save(id: string | null, input: CampaignInput) {
    const subject = input.subject.trim().slice(0, 180);
    const body = input.body.trim().slice(0, 12000);
    if (!subject || (!body && !input.productsText.trim() && !input.promoText.trim())) return { ok: false as const, error: "Completa el asunto y al menos un contenido para el correo." };
    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) return { ok: false as const, error: "Revisa la fecha programada." };
    const productsText = input.productsText.trim().slice(0, 5000) || null;
    const promoText = input.promoText.trim().slice(0, 240) || null;
    const ctaLabel = input.ctaLabel.trim().slice(0, 60) || null;
    const ctaUrl = input.ctaUrl.trim().slice(0, 500) || null;
    if ((ctaLabel && !ctaUrl) || (!ctaLabel && ctaUrl)) return { ok: false as const, error: "Completa el texto y el enlace del botón, o deja ambos vacíos." };
    if (ctaUrl && !/^https?:\/\//i.test(ctaUrl)) return { ok: false as const, error: "El enlace del botón debe comenzar con https:// o http://." };
    const data = { subject, body, productsText, promoText, ctaLabel, ctaUrl, scheduledAt, status: scheduledAt ? "programada" : "borrador" };
    if (id) await db.newsletterCampaign.update({ where: { id }, data: { ...data, lastError: null } });
    else await db.newsletterCampaign.create({ data });
    return { ok: true as const };
  },
  async remove(id: string) {
    const campaign = await db.newsletterCampaign.findUnique({ where: { id } });
    if (!campaign) return { ok: false as const, error: "No encontramos esta campaña." };
    if (campaign.status === "enviada" || (campaign.scheduledAt && campaign.scheduledAt <= new Date())) {
      return { ok: false as const, error: "Solo puedes eliminar borradores o campañas programadas para una fecha futura." };
    }
    await db.newsletterCampaign.delete({ where: { id } });
    return { ok: true as const };
  },
};
