import "server-only";
import { isISODate } from "@/domain/event";
import { type CampaignAction, type ComposerInput, isLocked, parseDiscounts } from "@/domain/newsletter";
import { MAX_DISCOUNT_PERCENT } from "@/domain/product";
import { chileDateTime, todayISO } from "@/lib/dates";
import { db } from "../db";
import { buildEmail, fromAddress, gmailTransport, unsubscribeUrlFor } from "../newsletter/mailer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SaveCampaignResult = { ok: true; id: string; status: string } | { ok: false; error: string };

function clean(input: ComposerInput) {
  return {
    subject: input.subject.trim().slice(0, 180),
    body: input.body.trim().slice(0, 12000),
    aiContext: input.aiContext.trim().slice(0, 2000) || null,
    productsText: input.productsText.trim().slice(0, 5000) || null,
    promoText: input.promoText.trim().slice(0, 240) || null,
    ctaLabel: input.ctaLabel.trim().slice(0, 60) || null,
    ctaUrl: input.ctaUrl.trim().slice(0, 500) || null,
  };
}

function contentError(c: ReturnType<typeof clean>): string | null {
  if (!c.subject) return "Escribe el asunto del correo.";
  if (!c.body && !c.productsText && !c.promoText) return "El correo está vacío: escribe el mensaje o pídeselo al asistente.";
  if ((c.ctaLabel && !c.ctaUrl) || (!c.ctaLabel && c.ctaUrl)) return "Completa el texto y el enlace del botón, o deja ambos vacíos.";
  if (c.ctaUrl && !/^https?:\/\//i.test(c.ctaUrl)) return "El enlace del botón debe comenzar con https:// o http://.";
  return null;
}

/** Revisa las piezas con descuento y los días en que rigen. Los borradores pueden quedar incompletos. */
async function checkPromo(input: ComposerInput, action: CampaignAction) {
  const discounts = parseDiscounts(input.discounts, MAX_DISCOUNT_PERCENT);
  if (Array.isArray(input.discounts) && discounts.length < input.discounts.length) {
    return { ok: false as const, error: `Revisa los descuentos: cada pieza una sola vez y entre 1% y ${MAX_DISCOUNT_PERCENT}%.` };
  }
  if (discounts.length) {
    const found = await db.product.count({ where: { id: { in: discounts.map((d) => d.productId) } } });
    if (found < discounts.length) return { ok: false as const, error: "Una de las piezas con descuento ya no existe. Quítala de la lista." };
  }
  const from = input.promoFrom || null;
  const until = input.promoUntil || null;
  if ((from && !isISODate(from)) || (until && !isISODate(until))) return { ok: false as const, error: "Revisa las fechas de la promoción." };
  if (from && until && until < from) return { ok: false as const, error: "La promoción tiene que terminar el mismo día o después de que empieza." };
  if (discounts.length && action !== "borrador") {
    if (!from || !until) return { ok: false as const, error: "Elige desde y hasta qué día rigen los descuentos." };
    if (until < todayISO()) return { ok: false as const, error: "La promoción ya terminó: cambia el día de término." };
  }
  return { ok: true as const, discounts, from, until };
}

export const newsletterCampaignService = {
  async list() {
    return db.newsletterCampaign.findMany({ orderBy: [{ updatedAt: "desc" }] });
  },

  async get(id: string) {
    return db.newsletterCampaign.findUnique({
      where: { id },
      include: { discounts: { include: { product: { select: { name: true, price: true } } }, orderBy: { createdAt: "asc" } } },
    });
  },

  /** "Terminar la promoción ahora": los descuentos dejan de regir desde hoy (la campaña enviada no cambia). */
  async endPromo(id: string) {
    const yesterday = todayISO(new Date(Date.now() - 86_400_000));
    const campaign = await db.newsletterCampaign.findUnique({ where: { id }, select: { promoFrom: true } });
    if (!campaign) return;
    await db.newsletterCampaign.update({
      where: { id },
      data: { promoUntil: yesterday, promoFrom: campaign.promoFrom && campaign.promoFrom > yesterday ? yesterday : campaign.promoFrom },
    });
  },

  /** Piezas publicadas, por nombre, que se pueden poner en descuento desde el editor. */
  async discountableProducts() {
    const rows = await db.product.findMany({ where: { published: true }, select: { id: true, name: true, slug: true, price: true } });
    return rows.sort((a, b) => a.name.localeCompare(b.name, "es"));
  },

  /** Cuántos correos de esta campaña ya salieron (o fallaron), para mostrar el avance. */
  async deliveredCount(id: string) {
    return db.newsletterDelivery.count({ where: { campaignId: id } });
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

  /** Guarda desde el editor: como borrador, programada para una hora, o lista para enviar ya. */
  async save(id: string | null, input: ComposerInput, action: CampaignAction): Promise<SaveCampaignResult> {
    if (id) {
      const current = await db.newsletterCampaign.findUnique({ where: { id }, select: { status: true } });
      if (!current) return { ok: false, error: "No encontramos esta campaña." };
      if (isLocked(current.status)) return { ok: false, error: "Esta campaña ya se envió y no se puede cambiar." };
    }

    const c = clean(input);
    const problem = contentError(c);
    if (problem) return { ok: false, error: problem };

    const eventAt = input.eventAt ? chileDateTime(input.eventAt) : null;
    if (input.eventAt && !eventAt) return { ok: false, error: "Revisa la fecha y hora del evento." };
    let scheduledAt = input.scheduledAt ? chileDateTime(input.scheduledAt) : null;
    if (input.scheduledAt && !scheduledAt) return { ok: false, error: "Revisa la fecha y hora de envío." };

    if (action !== "borrador" && (await this.subscriberCount()) === 0) {
      return { ok: false, error: "Todavía no hay suscriptores. Guárdala como borrador por ahora." };
    }
    if (action === "programar") {
      if (!scheduledAt) return { ok: false, error: "Elige el día y la hora de envío." };
      if (scheduledAt.getTime() < Date.now() - 60_000) return { ok: false, error: "Esa hora ya pasó. Elige una hora futura o usa “Enviar ahora”." };
    }
    if (action === "enviar") scheduledAt = new Date();

    const promo = await checkPromo(input, action);
    if (!promo.ok) return promo;

    const status = action === "borrador" ? "borrador" : "programada";
    const data = { ...c, eventAt, scheduledAt, status, lastError: null, promoFrom: promo.from, promoUntil: promo.until };
    const row = await db.$transaction(async (tx) => {
      const saved = id ? await tx.newsletterCampaign.update({ where: { id }, data }) : await tx.newsletterCampaign.create({ data });
      await tx.campaignDiscount.deleteMany({ where: { campaignId: saved.id } });
      if (promo.discounts.length) await tx.campaignDiscount.createMany({ data: promo.discounts.map((d) => ({ ...d, campaignId: saved.id })) });
      return saved;
    });
    // Al volver a mandarla (por ejemplo, tras arreglar Gmail) se reintentan los correos que fallaron;
    // a quienes ya les llegó no se les repite.
    if (id && action !== "borrador") await db.newsletterDelivery.deleteMany({ where: { campaignId: id, status: "error" } });
    return { ok: true, id: row.id, status };
  },

  async sendTest(input: ComposerInput & { recipient: string }) {
    const c = clean(input);
    const problem = contentError(c);
    if (problem) return { ok: false as const, error: problem };
    const recipient = input.recipient.trim().toLowerCase();
    if (recipient.length > 254 || !EMAIL_RE.test(recipient)) return { ok: false as const, error: "Escribe una dirección de correo válida." };
    try {
      const mail = gmailTransport();
      const subscriber = await db.newsletterSubscriber.findUnique({ where: { email: recipient }, select: { unsubscribeToken: true } });
      const { html, text } = buildEmail(c, subscriber?.unsubscribeToken ? unsubscribeUrlFor(subscriber.unsubscribeToken) : null);
      await mail.transporter.sendMail({ from: fromAddress(mail.user), to: recipient, subject: `[Prueba] ${c.subject}`, html, text });
      return { ok: true as const };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Error de conexión con Gmail.";
      return { ok: false as const, error: `No se pudo enviar. Revisa la configuración de Gmail. (${reason.slice(0, 180)})` };
    }
  },

  async remove(id: string) {
    const campaign = await db.newsletterCampaign.findUnique({ where: { id } });
    if (!campaign) return { ok: false as const, error: "No encontramos esta campaña." };
    if (isLocked(campaign.status)) return { ok: false as const, error: "No se puede eliminar una campaña que ya se envió." };
    await db.newsletterCampaign.delete({ where: { id } });
    return { ok: true as const };
  },
};
