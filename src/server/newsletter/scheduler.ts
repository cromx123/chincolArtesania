import "server-only";
import { db } from "../db";
import { sendCampaign } from "./sender";

// Programador del newsletter: cada minuto revisa si hay campañas programadas cuya
// hora ya llegó y las envía. Corre dentro del mismo servidor (Docker, `node server.js`),
// así que no necesita un cron externo. Todo pasa por `runDueCampaigns`, que nunca
// corre dos veces a la vez: así una campaña no se envía en paralelo.

const INTERVAL_MS = 60_000;

const state = globalThis as unknown as { __newsletterTimer?: NodeJS.Timeout; __newsletterRunning?: boolean };

async function nextDue() {
  return db.newsletterCampaign.findFirst({
    where: { OR: [{ status: "enviando" }, { status: "programada", scheduledAt: { lte: new Date() } }] },
    orderBy: { scheduledAt: "asc" },
    select: { id: true },
  });
}

/** Envía todo lo que esté pendiente. Si ya hay un envío en curso, no hace nada (ese envío seguirá con lo que falte). */
export async function runDueCampaigns(): Promise<void> {
  if (state.__newsletterRunning) return;
  state.__newsletterRunning = true;
  try {
    for (let due = await nextDue(); due; due = await nextDue()) {
      await sendCampaign(due.id);
    }
  } catch (e) {
    console.error("[newsletter] error en el programador:", e);
  } finally {
    state.__newsletterRunning = false;
  }
}

export function startNewsletterScheduler() {
  if (state.__newsletterTimer) return;
  state.__newsletterTimer = setInterval(() => void runDueCampaigns(), INTERVAL_MS);
  // Retoma al arrancar lo que haya quedado pendiente (por ejemplo, tras un reinicio).
  void runDueCampaigns();
}
