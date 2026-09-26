import "server-only";
import type { FairEvent as EventRow } from "@prisma/client";
import { type EventErrors, type EventInput, type FairEvent, isEventKind, isEventStatus, isISODate, isTime } from "@/domain/event";
import { cleanFairName } from "@/domain/sale";
import { db } from "../db";

export type SaveEventResult = { ok: true; id: string } | { ok: false; errors: EventErrors };

function toEvent(row: EventRow): FairEvent {
  return {
    id: row.id,
    name: row.name,
    kind: isEventKind(row.kind) ? row.kind : "evento",
    startDate: row.startDate,
    endDate: row.endDate,
    startTime: row.startTime,
    endTime: row.endTime,
    place: row.place,
    applyBy: row.applyBy,
    status: isEventStatus(row.status) ? row.status : "por-postular",
    cost: row.cost,
    note: row.note,
  };
}

function validate(input: EventInput): EventErrors {
  const errors: EventErrors = {};
  if (!cleanFairName(input.name)) errors.name = "Ponle un nombre.";
  if (!isEventKind(input.kind)) errors.kind = "Elige si es feria u otro evento.";
  if (!isISODate(input.startDate)) errors.startDate = "Elige el día en que empieza.";
  if (input.endDate && (!isISODate(input.endDate) || input.endDate < input.startDate)) errors.endDate = "Tiene que ser el mismo día o después del inicio.";
  if (input.startTime && !isTime(input.startTime)) errors.startTime = "Revisa la hora.";
  if (input.endTime && !isTime(input.endTime)) errors.endTime = "Revisa la hora.";
  const oneDay = !input.endDate || input.endDate === input.startDate;
  if (!errors.startTime && !errors.endTime && oneDay && input.startTime && input.endTime && input.endTime <= input.startTime) {
    errors.endTime = "Tiene que ser después de la hora de inicio.";
  }
  if (input.applyBy && !isISODate(input.applyBy)) errors.applyBy = "Revisa la fecha.";
  if (!isEventStatus(input.status)) errors.status = "Elige en qué va.";
  if (!Number.isInteger(input.cost) || input.cost < 0) errors.cost = "Revisa el valor.";
  return errors;
}

export const eventService = {
  async get(id: string): Promise<FairEvent | null> {
    const row = await db.fairEvent.findUnique({ where: { id } });
    return row ? toEvent(row) : null;
  },

  /** Eventos que tocan el rango [from, to] (inclusive), o cuya postulación cierra en él. */
  async between(from: string, to: string): Promise<FairEvent[]> {
    const rows = await db.fairEvent.findMany({
      where: {
        OR: [
          { startDate: { gte: from, lte: to } },
          { endDate: { gte: from, lte: to } },
          { startDate: { lt: from }, endDate: { gt: to } },
          { applyBy: { gte: from, lte: to } },
        ],
      },
      orderBy: { startDate: "asc" },
    });
    return rows.map(toEvent);
  },

  /** Lo que viene: eventos que aún no terminan y cierres de postulación pendientes. */
  async upcoming(today: string, limit = 8): Promise<FairEvent[]> {
    const rows = await db.fairEvent.findMany({
      where: {
        status: { not: "descartada" },
        OR: [{ startDate: { gte: today } }, { endDate: { gte: today } }, { applyBy: { gte: today } }],
      },
      orderBy: { startDate: "asc" },
      take: limit,
    });
    return rows.map(toEvent);
  },

  /** Postulaciones que cierran pronto y todavía no se envían. */
  async closingSoon(today: string, until: string): Promise<FairEvent[]> {
    const rows = await db.fairEvent.findMany({
      where: { status: "por-postular", applyBy: { gte: today, lte: until } },
      orderBy: { applyBy: "asc" },
    });
    return rows.map(toEvent);
  },

  /** Cuánto se vendió en una feria: ventas de canal "feria" con el mismo nombre (sin distinguir mayúsculas). */
  async salesAt(name: string): Promise<{ total: number; count: number }> {
    const target = cleanFairName(name)?.toLowerCase();
    if (!target) return { total: 0, count: 0 };
    const rows = await db.sale.findMany({ where: { channel: "feria", fairName: { not: null } }, select: { fairName: true, total: true } });
    const matches = rows.filter((r) => r.fairName!.toLowerCase() === target);
    return { total: matches.reduce((n, r) => n + r.total, 0), count: matches.length };
  },

  async save(id: string | null, input: EventInput): Promise<SaveEventResult> {
    const errors = validate(input);
    if (Object.keys(errors).length) return { ok: false, errors };

    const data = {
      name: cleanFairName(input.name)!,
      kind: input.kind,
      startDate: input.startDate,
      endDate: input.endDate && input.endDate !== input.startDate ? input.endDate : null,
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      place: input.place.trim() || null,
      applyBy: input.applyBy || null,
      status: input.status,
      cost: input.cost,
      note: input.note.trim() || null,
    };
    const row = id ? await db.fairEvent.update({ where: { id }, data }) : await db.fairEvent.create({ data });
    return { ok: true, id: row.id };
  },

  async remove(id: string) {
    await db.fairEvent.delete({ where: { id } });
  },
};
