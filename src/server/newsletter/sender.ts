import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "../db";
import { buildEmail, fromAddress, gmailTransport, unsubscribeUrlFor } from "./mailer";

// Envío real de una campaña a todos los suscriptores. Cada correo queda anotado en
// NewsletterDelivery, así un envío interrumpido (reinicio del servidor) se retoma
// sin repetirle el correo a nadie.

/** Pausa entre correos para no gatillar los límites de Gmail. */
const PAUSE_MS = 400;

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

function errorText(e: unknown): string {
  return (e instanceof Error ? e.message : String(e)).slice(0, 300);
}

async function tokenFor(subscriber: { id: string; unsubscribeToken: string | null }): Promise<string> {
  if (subscriber.unsubscribeToken) return subscriber.unsubscribeToken;
  const token = randomUUID();
  await db.newsletterSubscriber.update({ where: { id: subscriber.id }, data: { unsubscribeToken: token } });
  return token;
}

/** Envía (o retoma) una campaña. Solo se llama desde el programador, que evita envíos en paralelo. */
export async function sendCampaign(id: string): Promise<void> {
  const claimed = await db.newsletterCampaign.updateMany({
    where: { id, status: { in: ["programada", "enviando"] } },
    data: { status: "enviando", lastError: null },
  });
  if (claimed.count === 0) return;
  const campaign = await db.newsletterCampaign.findUniqueOrThrow({ where: { id } });

  let mail: ReturnType<typeof gmailTransport>;
  try {
    mail = gmailTransport();
  } catch (e) {
    await db.newsletterCampaign.update({ where: { id }, data: { status: "error", lastError: errorText(e) } });
    return;
  }

  const pending = await db.newsletterSubscriber.findMany({
    where: { status: "suscrito", deliveries: { none: { campaignId: id } } },
    orderBy: { subscribedAt: "asc" },
  });

  for (const subscriber of pending) {
    try {
      const { html, text } = buildEmail(campaign, unsubscribeUrlFor(await tokenFor(subscriber)));
      await mail.transporter.sendMail({ from: fromAddress(mail.user), to: subscriber.email, subject: campaign.subject, html, text });
      await db.newsletterDelivery.create({ data: { campaignId: id, subscriberId: subscriber.id, status: "enviado" } });
    } catch (e) {
      await db.newsletterDelivery.create({ data: { campaignId: id, subscriberId: subscriber.id, status: "error", error: errorText(e) } });
    }
    await pause(PAUSE_MS);
  }

  const [sent, failed] = await Promise.all([
    db.newsletterDelivery.count({ where: { campaignId: id, status: "enviado" } }),
    db.newsletterDelivery.count({ where: { campaignId: id, status: "error" } }),
  ]);
  const lastFailure = failed
    ? await db.newsletterDelivery.findFirst({ where: { campaignId: id, status: "error" }, orderBy: { createdAt: "desc" }, select: { error: true } })
    : null;

  await db.newsletterCampaign.update({
    where: { id },
    data: {
      status: sent === 0 && failed > 0 ? "error" : "enviada",
      sentAt: new Date(),
      sentCount: sent,
      failedCount: failed,
      lastError: failed ? `${failed === 1 ? "1 correo no se pudo enviar" : `${failed} correos no se pudieron enviar`}: ${lastFailure?.error ?? ""}` : null,
    },
  });
}
