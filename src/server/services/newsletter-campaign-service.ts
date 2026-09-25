import "server-only";
import nodemailer from "nodemailer";
import { db } from "../db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string) {
  return value.replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" })[c]!);
}

function gmailTransport() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) throw new Error("Configura GMAIL_USER y GMAIL_APP_PASSWORD en .env.");
  return { user, transporter: nodemailer.createTransport({ service: "gmail", auth: { user, pass } }) };
}

export type CampaignInput = { subject: string; body: string; scheduledAt: string };

export const newsletterCampaignService = {
  async list() {
    return db.newsletterCampaign.findMany({ orderBy: [{ scheduledAt: "asc" }, { updatedAt: "desc" }] });
  },
  async subscriberCount() {
    return db.newsletterSubscriber.count();
  },
  async subscribers() {
    return db.newsletterSubscriber.findMany({ select: { id: true, email: true }, orderBy: { createdAt: "desc" } });
  },
  async sendTest(input: { subject: string; body: string; recipient: string }) {
    const subject = input.subject.trim().slice(0, 180);
    const body = input.body.trim().slice(0, 12000);
    const recipient = input.recipient.trim().toLowerCase();
    if (!subject || !body) return { ok: false as const, error: "Completa el asunto y el mensaje de la campaña." };
    if (recipient.length > 254 || !EMAIL_RE.test(recipient)) return { ok: false as const, error: "Escribe una dirección de correo válida." };
    try {
      const { user, transporter } = gmailTransport();
      await transporter.sendMail({
        from: { name: process.env.NEWSLETTER_FROM_NAME?.trim() || "Chincol Artesanías", address: user },
        to: recipient,
        subject: `[Prueba] ${subject}`,
        text: body,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;line-height:1.6;white-space:pre-wrap">${escapeHtml(body)}</div>`,
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
    if (!subject || !body) return { ok: false as const, error: "Completa el asunto y el mensaje." };
    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) return { ok: false as const, error: "Revisa la fecha programada." };
    const data = { subject, body, scheduledAt, status: scheduledAt ? "programada" : "borrador" };
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
