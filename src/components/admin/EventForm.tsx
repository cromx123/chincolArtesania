"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { EVENT_KINDS, EVENT_STATUSES, type EventErrors, type EventInput } from "@/domain/event";
import { deleteEventAction, saveEventAction } from "@/app/admin/_actions/events";
import { ConfirmButton } from "./ConfirmButton";
import { Choice, MoneyInput } from "./inputs";
import { Notice } from "./Notice";

export function EventForm({ id, initial }: { id: string | null; initial: EventInput }) {
  const router = useRouter();
  const [form, setForm] = useState<EventInput>(initial);
  const [saved, setSaved] = useState<EventInput>(initial);
  const [errors, setErrors] = useState<EventErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const set = <K extends keyof EventInput>(key: K, value: EventInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  // Avisa antes de salir si quedaron cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function save() {
    start(async () => {
      const result = await saveEventAction(id, form);
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      setErrors({});
      if (!id) {
        router.push(`/admin/calendario?mes=${form.startDate.slice(0, 7)}&aviso=creado`);
      } else {
        setSaved(form);
        setNotice("Cambios guardados.");
        router.refresh();
      }
    });
  }

  const errorCount = Object.keys(errors).length;
  const isFair = form.kind === "feria";

  return (
    <div className="a-form a-form--with-bar">
      <Notice message={notice} />

      <section className="a-card">
        <div className="a-field">
          <span className="a-label">¿Qué es?</span>
          <Choice label="Tipo" options={EVENT_KINDS} value={form.kind} onChange={(v) => set("kind", v)} columns={2} />
        </div>

        <div className="a-field">
          <label htmlFor="ev-nombre" className="a-label">
            Nombre
          </label>
          <input
            id="ev-nombre"
            className="a-input"
            placeholder={isFair ? "Ej: Feria Pulgas Providencia" : "Ej: Taller de cuero en el Centro Cultural"}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            aria-invalid={errors.name ? true : undefined}
          />
          {errors.name && <p className="a-error">{errors.name}</p>}
          {isFair && <p className="a-hint">Usa el mismo nombre que pones al registrar ventas en la feria, así te muestro cuánto vendiste.</p>}
        </div>

        <div className="a-grid-2">
          <div className="a-field">
            <label htmlFor="ev-inicio" className="a-label">
              Día
            </label>
            <input
              id="ev-inicio"
              type="date"
              className="a-input"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              aria-invalid={errors.startDate ? true : undefined}
            />
            {errors.startDate && <p className="a-error">{errors.startDate}</p>}
          </div>
          <div className="a-field">
            <label htmlFor="ev-fin" className="a-label">
              Hasta <span className="a-optional">(si dura varios días)</span>
            </label>
            <input
              id="ev-fin"
              type="date"
              className="a-input"
              min={form.startDate || undefined}
              value={form.endDate}
              onChange={(e) => set("endDate", e.target.value)}
              aria-invalid={errors.endDate ? true : undefined}
            />
            {errors.endDate && <p className="a-error">{errors.endDate}</p>}
          </div>
        </div>

        <div className="a-grid-2">
          <div className="a-field">
            <label htmlFor="ev-hora-inicio" className="a-label">
              Hora de inicio <span className="a-optional">(opcional)</span>
            </label>
            <input
              id="ev-hora-inicio"
              type="time"
              className="a-input"
              value={form.startTime}
              onChange={(e) => set("startTime", e.target.value)}
              aria-invalid={errors.startTime ? true : undefined}
            />
            {errors.startTime && <p className="a-error">{errors.startTime}</p>}
          </div>
          <div className="a-field">
            <label htmlFor="ev-hora-fin" className="a-label">
              Hora de término <span className="a-optional">(opcional)</span>
            </label>
            <input
              id="ev-hora-fin"
              type="time"
              className="a-input"
              value={form.endTime}
              onChange={(e) => set("endTime", e.target.value)}
              aria-invalid={errors.endTime ? true : undefined}
            />
            {errors.endTime && <p className="a-error">{errors.endTime}</p>}
          </div>
        </div>
        {form.endDate && form.endDate !== form.startDate && (form.startTime || form.endTime) && <p className="a-hint">El mismo horario para todos los días.</p>}

        <div className="a-field">
          <label htmlFor="ev-lugar" className="a-label">
            Lugar <span className="a-optional">(opcional)</span>
          </label>
          <input id="ev-lugar" className="a-input" placeholder="Ej: Parque Bustamante" value={form.place} onChange={(e) => set("place", e.target.value)} />
        </div>
      </section>

      <section className="a-card">
        <h2 className="a-card__title">Postulación</h2>
        <div className="a-field">
          <span className="a-label">¿En qué va?</span>
          <Choice label="Estado" options={EVENT_STATUSES} value={form.status} onChange={(v) => set("status", v)} columns={4} />
        </div>

        <div className="a-grid-2">
          <div className="a-field">
            <label htmlFor="ev-cierre" className="a-label">
              Cierre de postulación <span className="a-optional">(opcional)</span>
            </label>
            <input
              id="ev-cierre"
              type="date"
              className="a-input"
              value={form.applyBy}
              onChange={(e) => set("applyBy", e.target.value)}
              aria-invalid={errors.applyBy ? true : undefined}
            />
            {errors.applyBy && <p className="a-error">{errors.applyBy}</p>}
          </div>
          <div className="a-field">
            <label htmlFor="ev-costo" className="a-label">
              {isFair ? "Valor del stand" : "Valor de inscripción"} <span className="a-optional">(opcional)</span>
            </label>
            <MoneyInput id="ev-costo" value={form.cost} onChange={(v) => set("cost", v)} invalid={Boolean(errors.cost)} placeholder="0" />
            {errors.cost && <p className="a-error">{errors.cost}</p>}
          </div>
        </div>

        <div className="a-field">
          <label htmlFor="ev-nota" className="a-label">
            Notas <span className="a-optional">(horario de montaje, contacto, qué llevar…)</span>
          </label>
          <textarea id="ev-nota" className="a-input a-textarea" rows={3} value={form.note} onChange={(e) => set("note", e.target.value)} />
        </div>
      </section>

      {id && <ConfirmButton label="Eliminar del calendario" confirmLabel="Sí, eliminar" warning="Se borra del calendario. Las ventas que registraste en esta feria no se tocan." onConfirm={() => deleteEventAction(id)} />}

      <div className="a-bar">
        {errorCount > 0 && (
          <p className="a-error" role="alert">
            Falta completar {errorCount === 1 ? "un dato" : `${errorCount} datos`} (marcados en rojo).
          </p>
        )}
        <div className="a-bar__row">
          <span className="a-muted a-small">{dirty ? "Tienes cambios sin guardar" : id ? "Todo guardado" : ""}</span>
          <button type="button" className="a-btn a-btn--primary a-btn--lg" onClick={save} disabled={pending || (!dirty && Boolean(id))}>
            {pending ? "Guardando…" : id ? "Guardar cambios" : "Agregar al calendario"}
          </button>
        </div>
      </div>
    </div>
  );
}
