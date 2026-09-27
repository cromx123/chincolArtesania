"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { type CampaignAction, type ComposerInput, MAX_CAMPAIGN_DISCOUNTS, type WriterRequest } from "@/domain/newsletter";
import { MAX_DISCOUNT_PERCENT, discountedPrice } from "@/domain/product";
import { todayISO } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { deleteCampaignAction, saveCampaignAction, sendTestNewsletterAction } from "@/app/admin/_actions/newsletter";
import { ConfirmButton } from "./ConfirmButton";
import { Notice } from "./Notice";

const ERROR_MARK = "\u0000ERROR:";
const TICK_MS = 35;
const QUICK_CHANGES = ["Parafrasea", "Hazlo más corto", "Hazlo más cercano", "Hazlo más entusiasta"];

type Selection = { start: number; end: number };
type Writing = { prefix: string; suffix: string; partial: boolean };

export interface DiscountableProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
}

const DEFAULT_PERCENT = 20;

function clampPercent(value: string): number {
  const n = Math.round(Number(value.replace(/\D/g, "")));
  return Number.isFinite(n) ? Math.min(MAX_DISCOUNT_PERCENT, Math.max(0, n)) : 0;
}

/** Cuánto avanzar en el texto recibido: palabras completas; al final, lo que quede. */
function nextEnd(buffer: string, from: number, done: boolean, words: number): number {
  let end = from;
  for (let i = 0; i < words; i++) {
    const rest = buffer.slice(end);
    const word = rest.match(/^\s*\S+(?=\s)/);
    if (word) end += word[0].length;
    else if (done) end = buffer.length;
    else break;
  }
  return end;
}

/** Limpia lo que devuelve el asistente: sin Markdown ni comillas envolventes. */
function tidy(text: string, fragment: boolean): string {
  let t = text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1").replace(/^#{1,6}\s+/gm, "").trim();
  if (fragment) t = t.replace(/^[«"“]([\s\S]*)[»"”]$/, "$1").trim();
  return t;
}

export function NewsletterComposer({
  id: initialId,
  initial,
  subscribers,
  subscriberEmails,
  products,
  storeUrl,
}: {
  id: string | null;
  initial: ComposerInput;
  subscribers: number;
  subscriberEmails: string[];
  /** Piezas publicadas que se pueden poner en descuento. */
  products: DiscountableProduct[];
  storeUrl: string;
}) {
  const router = useRouter();
  const [id, setId] = useState(initialId);
  const [form, setForm] = useState<ComposerInput>(initial);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Asistente
  const [writing, setWriting] = useState<Writing | null>(null);
  const [shown, setShown] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [instruction, setInstruction] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const bufferRef = useRef("");
  const doneRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Envío
  const [scheduling, setScheduling] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");

  // Piezas con descuento
  const [pickId, setPickId] = useState("");
  const [pickPercent, setPickPercent] = useState(DEFAULT_PERCENT);

  const set = <K extends keyof ComposerInput>(key: K, value: ComposerInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const productById = (productId: string) => products.find((p) => p.id === productId);
  const available = products.filter((p) => !form.discounts.some((d) => d.productId === p.id));

  function addDiscount() {
    const product = productById(pickId);
    if (!product || pickPercent < 1) return;
    setForm((f) => ({
      ...f,
      discounts: [...f.discounts, { productId: product.id, percent: pickPercent }],
      // Al agregar la primera pieza se proponen fechas: desde hoy hasta el día del evento.
      promoFrom: f.promoFrom || todayISO(),
      promoUntil: f.promoUntil || f.eventAt.slice(0, 10),
    }));
    setPickId("");
  }

  function setDiscountPercent(productId: string, percent: number) {
    setForm((f) => ({ ...f, discounts: f.discounts.map((d) => (d.productId === productId ? { ...d, percent } : d)) }));
  }

  function removeDiscount(productId: string) {
    setForm((f) => ({ ...f, discounts: f.discounts.filter((d) => d.productId !== productId) }));
  }

  /** Arma las tarjetas de productos del correo con las piezas en descuento. */
  function discountCards() {
    const lines = form.discounts.flatMap((d) => {
      const p = productById(d.productId);
      return p ? [`${p.name} | ${d.percent}% de descuento · antes ${formatPrice(p.price)} | ${formatPrice(discountedPrice(p.price, d.percent))} | ${storeUrl}/catalogo/${p.slug}`] : [];
    });
    set("productsText", lines.join("\n"));
    setNotice("Listo: las piezas quedaron como tarjetas en el correo (puedes verlas en “Más opciones del correo”).");
  }

  const writerContext = {
    subject: form.subject,
    eventAt: form.eventAt,
    context: form.aiContext,
    discounts: form.discounts,
    promoFrom: form.promoFrom,
    promoUntil: form.promoUntil,
  };
  const busy = pending || writing !== null;
  const selectedText = selection ? form.body.slice(selection.start, selection.end) : "";

  // El cuadro de texto crece con el contenido, como una hoja.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [form.body, writing]);

  useEffect(() => () => abortRef.current?.abort(), []);

  /** Muestra el texto recibido de a poco; resuelve cuando ya mostró todo. */
  function typewriter(): Promise<string> {
    return new Promise((resolve) => {
      let end = 0;
      const timer = setInterval(() => {
        const buffer = bufferRef.current;
        const backlog = buffer.length - end;
        const words = backlog > 600 ? 6 : backlog > 250 ? 3 : backlog > 100 ? 2 : 1;
        end = nextEnd(buffer, end, doneRef.current, words);
        setShown(buffer.slice(0, end));
        if (doneRef.current && end >= buffer.length) {
          clearInterval(timer);
          resolve(buffer);
        }
      }, TICK_MS);
    });
  }

  async function runWriter(request: WriterRequest, sel: Selection | null) {
    setError(null);
    setNotice(null);
    const prefix = sel ? form.body.slice(0, sel.start) : "";
    const suffix = sel ? form.body.slice(sel.end) : "";
    const original = sel ? form.body.slice(sel.start, sel.end) : "";
    const previous = form.body;

    bufferRef.current = "";
    doneRef.current = false;
    setShown("");
    setWriting({ prefix, suffix, partial: Boolean(sel) });
    const controller = new AbortController();
    abortRef.current = controller;
    const shownAll = typewriter();

    let failure: string | null = null;
    try {
      const res = await fetch("/admin/newsletter/escribir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      const isText = res.headers.get("content-type")?.startsWith("text/plain");
      if (res.redirected || (res.ok && !isText)) {
        // El middleware redirige al login si la sesión expiró: no mostrar esa página como texto.
        failure = "Tu sesión expiró. Copia tu texto y vuelve a entrar.";
      } else if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        failure = data.error ?? "El asistente no pudo responder.";
      } else if (!res.body) {
        failure = "El asistente no pudo responder.";
      } else {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          bufferRef.current += decoder.decode(value, { stream: true });
          const mark = bufferRef.current.indexOf(ERROR_MARK);
          if (mark >= 0) {
            failure = bufferRef.current.slice(mark + ERROR_MARK.length);
            bufferRef.current = bufferRef.current.slice(0, mark);
            break;
          }
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) failure = "Se cortó la conexión con el asistente.";
    }
    doneRef.current = true;
    const text = tidy(await shownAll, Boolean(sel));
    abortRef.current = null;
    setWriting(null);
    setSelection(null);

    if (!text) {
      setError(failure ?? "El asistente no devolvió texto.");
      return;
    }
    const replacement = sel ? `${original.match(/^\s*/)![0]}${text}${original.match(/\s*$/)![0]}` : text;
    setHistory((h) => (previous.trim() ? [...h, previous] : h));
    set("body", `${prefix}${replacement}${suffix}`);
    if (failure) setError(`${failure} Quedó lo que alcanzó a escribir.`);
  }

  function write() {
    runWriter({ mode: "escribir", ...writerContext }, null);
  }

  function change(text: string) {
    const what = text.trim();
    if (!what || !form.body.trim()) return;
    const sel = selection && selection.end > selection.start ? selection : null;
    runWriter({ mode: "cambiar", ...writerContext, body: form.body, instruction: what, selection: sel }, sel);
    setInstruction("");
  }

  function undo() {
    const last = history.at(-1);
    if (last === undefined) return;
    setHistory((h) => h.slice(0, -1));
    set("body", last);
    setSelection(null);
  }

  function trackSelection() {
    const el = textareaRef.current;
    if (!el) return;
    setSelection(el.selectionEnd > el.selectionStart ? { start: el.selectionStart, end: el.selectionEnd } : null);
  }

  function save(action: CampaignAction) {
    setError(null);
    start(async () => {
      const result = await saveCampaignAction(id, form, action);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (action === "borrador") {
        setNotice("Borrador guardado.");
        if (!id) {
          setId(result.id);
          router.replace(`/admin/newsletter/${result.id}`);
        } else router.refresh();
        return;
      }
      router.push(`/admin/newsletter?aviso=${action === "enviar" ? "enviando" : "programada"}`);
    });
  }

  function sendTest() {
    setError(null);
    start(async () => {
      const result = await sendTestNewsletterAction({ ...form, recipient: testRecipient });
      if (result.ok) setNotice(`Correo de prueba enviado a ${testRecipient}.`);
      else setError(result.error);
    });
  }

  const hasContent = Boolean(form.body.trim() || form.productsText.trim() || form.promoText.trim());
  const canSend = Boolean(form.subject.trim()) && hasContent && !busy;
  const words = form.body.trim() ? form.body.trim().split(/\s+/).length : 0;

  return (
    <div className="a-form a-form--with-bar">
      <Notice message={notice} />

      <section className="a-card">
        <h2 className="a-card__title">La campaña</h2>
        <div className="a-field">
          <label htmlFor="nl-asunto" className="a-label">
            Asunto del correo
          </label>
          <input
            id="nl-asunto"
            className="a-input"
            maxLength={180}
            placeholder="Ej: ¡Promo Día del Padre!"
            value={form.subject}
            onChange={(e) => set("subject", e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="a-field">
          <label htmlFor="nl-evento" className="a-label">
            Fecha y hora del evento o promoción <span className="a-optional">(opcional)</span>
          </label>
          <input id="nl-evento" type="datetime-local" className="a-input" value={form.eventAt} onChange={(e) => set("eventAt", e.target.value)} disabled={busy} />
        </div>
        <div className="a-field">
          <label htmlFor="nl-contexto" className="a-label">
            ¿Qué quieres contar? <span className="a-optional">(para el asistente)</span>
          </label>
          <textarea
            id="nl-contexto"
            className="a-input a-textarea"
            rows={3}
            maxLength={2000}
            placeholder="Ej: quiero que esta promoción indique un 20% de descuento en todos los productos por el Día del Padre, para que regaloneen a sus papás."
            value={form.aiContext}
            onChange={(e) => set("aiContext", e.target.value)}
            disabled={busy}
          />
        </div>

        <div className="nl-discounts">
          <div>
            <span className="a-label">
              Piezas con descuento <span className="a-optional">(opcional)</span>
            </span>
            <p className="a-hint">Elige piezas de la tienda y su descuento. El asistente las usará al escribir el correo.</p>
          </div>

          {form.discounts.length > 0 && (
            <ul className="nl-discounts__list">
              {form.discounts.map((d) => {
                const p = productById(d.productId);
                return (
                  <li key={d.productId}>
                    <span className="nl-discounts__name">
                      <strong>{p?.name ?? "Pieza que ya no está en la tienda"}</strong>
                      {p && (
                        <span className="a-muted a-small">
                          <s>{formatPrice(p.price)}</s> → <strong className="nl-discounts__now">{formatPrice(discountedPrice(p.price, d.percent))}</strong>
                        </span>
                      )}
                    </span>
                    <span className="nl-percent">
                      <input
                        className="a-input"
                        inputMode="numeric"
                        aria-label={`Descuento de ${p?.name ?? "la pieza"}`}
                        value={d.percent || ""}
                        onChange={(e) => setDiscountPercent(d.productId, clampPercent(e.target.value))}
                        disabled={busy}
                      />
                      <span aria-hidden>%</span>
                    </span>
                    <button type="button" className="a-link-btn" onClick={() => removeDiscount(d.productId)} disabled={busy}>
                      Quitar
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {available.length > 0 && form.discounts.length < MAX_CAMPAIGN_DISCOUNTS && (
            <div className="nl-discounts__add">
              <select className="a-input" aria-label="Pieza para poner en descuento" value={pickId} onChange={(e) => setPickId(e.target.value)} disabled={busy}>
                <option value="">Elegir una pieza…</option>
                {available.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {formatPrice(p.price)}
                  </option>
                ))}
              </select>
              <span className="nl-percent">
                <input
                  className="a-input"
                  inputMode="numeric"
                  aria-label="Porcentaje de descuento"
                  value={pickPercent || ""}
                  onChange={(e) => setPickPercent(clampPercent(e.target.value))}
                  disabled={busy}
                />
                <span aria-hidden>%</span>
              </span>
              <button type="button" className="a-btn a-btn--ghost" onClick={addDiscount} disabled={busy || !pickId || pickPercent < 1}>
                Agregar
              </button>
            </div>
          )}

          {form.discounts.length > 0 && (
            <>
              <div className="a-grid-2">
                <div className="a-field">
                  <label htmlFor="nl-promo-desde" className="a-label">
                    Rige desde
                  </label>
                  <input id="nl-promo-desde" type="date" className="a-input" value={form.promoFrom} onChange={(e) => set("promoFrom", e.target.value)} disabled={busy} />
                </div>
                <div className="a-field">
                  <label htmlFor="nl-promo-hasta" className="a-label">
                    Hasta (inclusive)
                  </label>
                  <input
                    id="nl-promo-hasta"
                    type="date"
                    className="a-input"
                    min={form.promoFrom || undefined}
                    value={form.promoUntil}
                    onChange={(e) => set("promoUntil", e.target.value)}
                    disabled={busy}
                  />
                </div>
              </div>
              <p className="a-hint">
                Los precios cambian en la tienda, el carrito y el bot solo esos días, y solo cuando programes o envíes la campaña. Mientras sea borrador, la
                tienda no cambia.
              </p>
              <button type="button" className="a-link-btn a-link-btn--left" onClick={discountCards} disabled={busy}>
                Mostrar estas piezas como tarjetas en el correo
              </button>
            </>
          )}
        </div>

        <button type="button" className="a-btn a-btn--primary" onClick={write} disabled={busy || !form.subject.trim()}>
          {form.body.trim() ? "Escribir de nuevo con el asistente" : "Escribir el correo con el asistente"}
        </button>
        {!form.subject.trim() && <p className="a-hint">Escribe el asunto para que el asistente sepa de qué se trata.</p>}
      </section>

      <section className="nl-sheet" aria-live="polite" aria-busy={writing !== null}>
        <div className="nl-sheet__head">
          <span className="nl-sheet__label">Asunto</span>
          <span className="nl-sheet__subject">{form.subject.trim() || "Sin asunto"}</span>
        </div>
        {writing ? (
          <div className="nl-sheet__text nl-sheet__text--writing">
            {writing.prefix && <span className="nl-dim">{writing.prefix}</span>}
            <span className={writing.partial ? "nl-fresh" : undefined}>
              {shown.split(/(\s+)/).map((token, i) => (
                <span key={i} className={/\S/.test(token) ? "nl-word" : undefined}>
                  {token}
                </span>
              ))}
              <span className="nl-caret" aria-hidden />
            </span>
            {writing.suffix && <span className="nl-dim">{writing.suffix}</span>}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className="nl-sheet__text nl-sheet__editor"
            aria-label="Cuerpo del correo"
            placeholder="Aquí aparecerá el correo. Pídeselo al asistente o escríbelo tú."
            maxLength={12000}
            value={form.body}
            onChange={(e) => {
              set("body", e.target.value);
              setSelection(null);
            }}
            onSelect={trackSelection}
            disabled={pending}
          />
        )}
        <div className="nl-sheet__foot">
          {writing ? (
            <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => abortRef.current?.abort()}>
              Detener
            </button>
          ) : (
            <span className="a-muted a-small">{words ? `${words} palabras · puedes corregir directo aquí` : ""}</span>
          )}
          {history.length > 0 && !writing && (
            <button type="button" className="a-link-btn" onClick={undo}>
              Deshacer el último cambio del asistente
            </button>
          )}
        </div>
      </section>

      {error && (
        <p className="a-error" role="alert">
          {error}
        </p>
      )}

      <section className="a-card">
        <h2 className="a-card__title">Pedir cambios al asistente</h2>
        <p className="a-hint">
          {selectedText.trim() ? (
            <>
              Cambiará solo lo que seleccionaste: <em>“{selectedText.length > 80 ? `${selectedText.slice(0, 80)}…` : selectedText}”</em>{" "}
              <button type="button" className="a-link-btn" onClick={() => setSelection(null)}>
                (usar todo el correo)
              </button>
            </>
          ) : (
            "Se aplica a todo el correo. Si seleccionas una parte del texto, cambia solo esa parte."
          )}
        </p>
        <div className="nl-chips">
          {QUICK_CHANGES.map((q) => (
            <button key={q} type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => change(q)} disabled={busy || !form.body.trim()}>
              {q}
            </button>
          ))}
        </div>
        <form
          className="nl-ask"
          onSubmit={(e) => {
            e.preventDefault();
            change(instruction);
          }}
        >
          <input
            className="a-input"
            placeholder="Ej: menciona que el despacho es gratis, cambia el saludo…"
            maxLength={1000}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            disabled={busy || !form.body.trim()}
            aria-label="Cambio que quieres pedir"
          />
          <button type="submit" className="a-btn a-btn--primary" disabled={busy || !instruction.trim() || !form.body.trim()}>
            Aplicar
          </button>
        </form>
      </section>

      <details className="a-card nl-more">
        <summary className="a-card__title">Más opciones del correo</summary>
        <div className="a-field">
          <label htmlFor="nl-promo" className="a-label">
            Franja destacada <span className="a-optional">(ej: 20% en toda la tienda)</span>
          </label>
          <input id="nl-promo" className="a-input" maxLength={240} value={form.promoText} onChange={(e) => set("promoText", e.target.value)} disabled={busy} />
        </div>
        <div className="a-grid-2">
          <div className="a-field">
            <label htmlFor="nl-cta" className="a-label">
              Texto del botón
            </label>
            <input id="nl-cta" className="a-input" maxLength={60} placeholder="Ver la tienda" value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} disabled={busy} />
          </div>
          <div className="a-field">
            <label htmlFor="nl-cta-url" className="a-label">
              Enlace del botón
            </label>
            <input id="nl-cta-url" type="url" className="a-input" placeholder="https://…" value={form.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} disabled={busy} />
          </div>
        </div>
        <div className="a-field">
          <label htmlFor="nl-productos" className="a-label">
            Productos destacados <span className="a-optional">(uno por línea: Nombre | descripción | precio | enlace)</span>
          </label>
          <textarea id="nl-productos" className="a-input a-textarea" rows={3} maxLength={5000} value={form.productsText} onChange={(e) => set("productsText", e.target.value)} disabled={busy} />
        </div>
        <div className="a-field">
          <label htmlFor="nl-prueba" className="a-label">
            Enviarme una prueba
          </label>
          <div className="nl-ask">
            <input
              id="nl-prueba"
              type="email"
              className="a-input"
              list="nl-suscriptores"
              placeholder="tu@correo.cl"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
            />
            <datalist id="nl-suscriptores">
              {subscriberEmails.map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
            <button type="button" className="a-btn a-btn--ghost" onClick={sendTest} disabled={!canSend || !testRecipient.trim()}>
              Enviar prueba
            </button>
          </div>
          <p className="a-hint">Llega solo a ese correo, con “[Prueba]” en el asunto.</p>
        </div>
      </details>

      {id && (
        <ConfirmButton
          label="Eliminar campaña"
          confirmLabel="Sí, eliminar"
          warning="Se borra esta campaña. No se envía nada."
          onConfirm={async () => {
            const result = await deleteCampaignAction(id);
            if (result.ok) router.push("/admin/newsletter?aviso=eliminada");
            else setError(result.error);
          }}
        />
      )}

      <div className="a-bar">
        {scheduling && (
          <div className="nl-schedule">
            <label htmlFor="nl-programar" className="a-label">
              ¿Cuándo se envía?
            </label>
            <input id="nl-programar" type="datetime-local" className="a-input" value={form.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} />
            <button type="button" className="a-btn a-btn--primary" onClick={() => save("programar")} disabled={!canSend || !form.scheduledAt}>
              Programar
            </button>
            <button type="button" className="a-btn a-btn--ghost" onClick={() => setScheduling(false)}>
              Cancelar
            </button>
          </div>
        )}
        <div className="a-bar__row nl-actions">
          <span className="a-muted a-small">{subscribers === 1 ? "1 suscriptor" : `${subscribers} suscriptores`}</span>
          <button type="button" className="a-btn a-btn--ghost" onClick={() => save("borrador")} disabled={busy || !form.subject.trim()}>
            Guardar borrador
          </button>
          <button type="button" className="a-btn a-btn--ghost" onClick={() => setScheduling((v) => !v)} disabled={!canSend}>
            Programar envío
          </button>
          {canSend ? (
            <ConfirmButton
              label="Enviar ahora"
              confirmLabel={`Sí, enviar a ${subscribers}`}
              warning={`Se enviará “${form.subject.trim()}” a ${subscribers === 1 ? "1 suscriptor" : `${subscribers} suscriptores`}. No se puede deshacer.`}
              className="a-btn a-btn--primary"
              onConfirm={() => save("enviar")}
            />
          ) : (
            <button type="button" className="a-btn a-btn--primary" disabled>
              Enviar ahora
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
