import "server-only";
import nodemailer from "nodemailer";
import { newsletterBaseUrl, renderNewsletterEmail } from "../services/newsletter-template";

// Conexión con Gmail y armado de cada correo del newsletter (prueba y envío real).

export function gmailTransport() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) throw new Error("Configura GMAIL_USER y GMAIL_APP_PASSWORD en .env.local.");
  return { user, transporter: nodemailer.createTransport({ service: "gmail", auth: { user, pass } }) };
}

export function fromAddress(user: string) {
  return { name: process.env.NEWSLETTER_FROM_NAME?.trim() || "Chincol Artesanía", address: user };
}

export interface EmailContent {
  body: string;
  productsText?: string | null;
  promoText?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
}

export function unsubscribeUrlFor(token: string): string {
  return `${newsletterBaseUrl()}/newsletter/unsubscribe/${token}`;
}

/** HTML con la plantilla de la marca y su versión en texto plano. */
export function buildEmail(content: EmailContent, unsubscribeUrl: string | null) {
  const contact = process.env.NEXT_PUBLIC_EMAIL?.trim();
  const cta = content.ctaLabel?.trim() && content.ctaUrl?.trim() ? `${content.ctaLabel.trim()}: ${content.ctaUrl.trim()}` : null;
  const text = [
    content.body.trim(),
    content.promoText?.trim(),
    cta,
    `Chincol Artesanía · ${newsletterBaseUrl()}`,
    contact ? `Contacto: ${contact}` : null,
    unsubscribeUrl ? `Darte de baja: ${unsubscribeUrl}` : "Correo de prueba del newsletter.",
  ]
    .filter(Boolean)
    .join("\n\n");
  return { html: renderNewsletterEmail({ ...content, unsubscribeUrl }), text };
}
