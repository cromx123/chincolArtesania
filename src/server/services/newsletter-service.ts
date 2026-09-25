import "server-only";
import { db } from "../db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const newsletterService = {
  isValidEmail(email: string) {
    return email.length <= 254 && EMAIL_RE.test(email);
  },

  /** Guarda el correo; si ya estaba suscrito no hace nada. */
  async subscribe(email: string) {
    const normalized = email.trim().toLowerCase();
    await db.newsletterSubscriber.upsert({
      where: { email: normalized },
      create: { email: normalized, status: "suscrito", subscribedAt: new Date(), unsubscribedAt: null },
      update: { status: "suscrito", subscribedAt: new Date(), unsubscribedAt: null },
    });
  },

  async unsubscribe(token: string) {
    const subscriber = await db.newsletterSubscriber.findUnique({ where: { unsubscribeToken: token } });
    if (!subscriber) return false;
    if (subscriber.status !== "dado-de-baja") {
      await db.newsletterSubscriber.update({ where: { id: subscriber.id }, data: { status: "dado-de-baja", unsubscribedAt: new Date() } });
    }
    return true;
  },
};
