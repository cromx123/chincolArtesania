// Calendario: ferias y eventos. Las fechas son días de Chile en texto ("2026-10-04").

export const EVENT_KINDS = [
  { id: "feria", name: "Feria" },
  { id: "evento", name: "Otro evento" },
] as const;
export type EventKind = (typeof EVENT_KINDS)[number]["id"];

export const EVENT_STATUSES = [
  { id: "por-postular", name: "Por postular" },
  { id: "postulada", name: "Postulé" },
  { id: "confirmada", name: "Voy" },
  { id: "descartada", name: "No voy" },
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number]["id"];

export interface FairEvent {
  id: string;
  name: string;
  kind: EventKind;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  place: string | null;
  applyBy: string | null;
  status: EventStatus;
  cost: number;
  note: string | null;
}

export type EventInput = Omit<FairEvent, "id" | "endDate" | "startTime" | "endTime" | "place" | "applyBy" | "note"> & {
  endDate: string;
  startTime: string;
  endTime: string;
  place: string;
  applyBy: string;
  note: string;
};

export type EventErrors = Partial<Record<keyof EventInput, string>>;

export const EMPTY_EVENT: EventInput = {
  name: "",
  kind: "feria",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  place: "",
  applyBy: "",
  status: "por-postular",
  cost: 0,
  note: "",
};

export function isEventKind(v: string): v is EventKind {
  return EVENT_KINDS.some((k) => k.id === v);
}

export function isEventStatus(v: string): v is EventStatus {
  return EVENT_STATUSES.some((s) => s.id === v);
}

export function statusName(id: string): string {
  return EVENT_STATUSES.find((s) => s.id === id)?.name ?? id;
}

export function isTime(v: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

/** "10:00 a 19:00", "desde las 10:00", "hasta las 19:00" o null si no hay horario. */
export function formatHours(e: Pick<FairEvent, "startTime" | "endTime">): string | null {
  if (e.startTime && e.endTime) return `${e.startTime} a ${e.endTime}`;
  if (e.startTime) return `desde las ${e.startTime}`;
  if (e.endTime) return `hasta las ${e.endTime}`;
  return null;
}

export function isISODate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T12:00:00Z`));
}

/** Último día del evento (el mismo día si dura uno). */
export function lastDay(e: Pick<FairEvent, "startDate" | "endDate">): string {
  return e.endDate && e.endDate > e.startDate ? e.endDate : e.startDate;
}

/** Días entre dos fechas "YYYY-MM-DD" (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

/** "sábado 4 de octubre", o "4 al 6 de octubre" si dura varios días. */
export function formatDay(iso: string, withWeekday = true): string {
  const date = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat("es-CL", {
    weekday: withWeekday ? "long" : undefined,
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

export function formatRange(e: Pick<FairEvent, "startDate" | "endDate">): string {
  const end = lastDay(e);
  if (end === e.startDate) return capitalize(formatDay(e.startDate));
  const sameMonth = end.slice(0, 7) === e.startDate.slice(0, 7);
  const from = sameMonth ? String(Number(e.startDate.slice(8))) : formatDay(e.startDate, false);
  return `Del ${from} al ${formatDay(end, false)}`;
}

/** "hoy", "mañana", "en 5 días", "hace 3 días". */
export function relativeDays(from: string, to: string): string {
  const n = daysBetween(from, to);
  if (n === 0) return "hoy";
  if (n === 1) return "mañana";
  if (n === -1) return "ayer";
  return n > 0 ? `en ${n} días` : `hace ${-n} días`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
