// Fechas en hora de Chile, sin importar dónde corra el servidor.

export const TIME_ZONE = "America/Santiago";

/** "2026-09-23" en hora de Chile. */
export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

/** "2026-09" en hora de Chile. */
export function currentMonth(now = new Date()): string {
  return todayISO(now).slice(0, 7);
}

/** Desfase de Chile para una fecha, ej. "-03:00". */
function offsetFor(date: Date): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, timeZoneName: "shortOffset" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value; // "GMT-3"
  const m = part?.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return "-03:00";
  return `${m[1]}${m[2].padStart(2, "0")}:${m[3] ?? "00"}`;
}

/** Inicio de un día chileno como Date (UTC). */
export function startOfDay(isoDate: string): Date {
  const guess = new Date(`${isoDate}T12:00:00Z`);
  return new Date(`${isoDate}T00:00:00${offsetFor(guess)}`);
}

/** Mediodía de un día chileno: se usa al registrar ventas de otro día. */
export function middayOf(isoDate: string): Date {
  const guess = new Date(`${isoDate}T12:00:00Z`);
  return new Date(`${isoDate}T12:00:00${offsetFor(guess)}`);
}

export function isValidMonth(value: string | undefined): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthRange(month: string): { start: Date; end: Date } {
  return { start: startOfDay(`${month}-01`), end: startOfDay(`${shiftMonth(month, 1)}-01`) };
}

export function monthName(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const name = new Intl.DateTimeFormat("es-CL", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 15)));
  return y === Number(currentMonth().slice(0, 4)) ? name : `${name} ${y}`;
}

/** "hoy", "ayer" o "lunes 21 de septiembre". */
export function dayLabel(date: Date): string {
  const iso = todayISO(date);
  const today = todayISO();
  if (iso === today) return "Hoy";
  if (iso === todayISO(new Date(Date.now() - 86_400_000))) return "Ayer";
  const text = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: TIME_ZONE }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function greeting(now = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: TIME_ZONE }).format(now));
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}
