"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCampaignAction, saveCampaignAction, sendTestNewsletterAction } from "@/app/admin/_actions/newsletter";

type Campaign = { id: string; subject: string; body: string; productsText: string | null; promoText: string | null; ctaLabel: string | null; ctaUrl: string | null; scheduledAt: Date | null; status: string; sentAt: Date | null; lastError: string | null };
type Subscriber = { id: string; email: string };
type SubscriberHistory = Subscriber & { status: string; subscribedAt: Date; unsubscribedAt: Date | null };
const localValue = (date: Date | null) => date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";

export function NewsletterCampaignForm({ campaigns, subscribers, subscriberRows, subscriberHistory }: { campaigns: Campaign[]; subscribers: number; subscriberRows: Subscriber[]; subscriberHistory: SubscriberHistory[] }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [productsText, setProductsText] = useState("");
  const [promoText, setPromoText] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notice, setNotice] = useState("");
  const [testRecipient, setTestRecipient] = useState("");
  const [busy, start] = useTransition();
  function reset() { setId(null); setSubject(""); setBody(""); setProductsText(""); setPromoText(""); setCtaLabel(""); setCtaUrl(""); setScheduledAt(""); }
  function save() {
    start(async () => {
      const result = await saveCampaignAction(id, { subject, body, productsText, promoText, ctaLabel, ctaUrl, scheduledAt });
      if (!result.ok) { setNotice(result.error); return; }
      setNotice(id ? "Cambios guardados." : "Campaña guardada."); reset(); router.refresh();
    });
  }
  function sendTest() {
    start(async () => {
      const result = await sendTestNewsletterAction({ subject, body, productsText, promoText, ctaLabel, ctaUrl, recipient: testRecipient });
      setNotice(result.ok ? `Correo de prueba enviado a ${testRecipient}.` : result.error);
    });
  }
  return <div className="a-stack">
    <section className="a-card a-stack">
      <div><h2 className="a-card__title">Crear campaña</h2><p className="a-hint">Prepara y guarda el mensaje. El envío por correo se añadirá más adelante.</p></div>
      <div className="a-field"><label className="a-label" htmlFor="nl-subject">Asunto</label><input id="nl-subject" className="a-input" maxLength={180} value={subject} onChange={e => setSubject(e.target.value)} /></div>
      <div className="a-field"><label className="a-label" htmlFor="nl-body">Mensaje</label><textarea id="nl-body" className="a-input a-textarea" rows={9} maxLength={12000} value={body} onChange={e => setBody(e.target.value)} /></div>
      <div className="a-field"><label className="a-label" htmlFor="nl-products">Productos <span className="a-optional">(opcional)</span></label><textarea id="nl-products" className="a-input a-textarea" rows={4} maxLength={5000} placeholder={'Un producto por línea: Nombre | descripción | precio | enlace\nEj: Bolso Chincol | Cuero hecho a mano | $35.000 | https://…'} value={productsText} onChange={e => setProductsText(e.target.value)} /><p className="a-hint">Deja vacío si el correo es solo un aviso. Para cada producto completa los datos separados por |; descripción, precio y enlace son opcionales.</p></div>
      <div className="a-field"><label className="a-label" htmlFor="nl-promo">Franja promocional <span className="a-optional">(opcional: oferta, feria o aviso breve)</span></label><input id="nl-promo" className="a-input" maxLength={240} value={promoText} onChange={e => setPromoText(e.target.value)} /></div>
      <div className="a-grid-2"><div className="a-field"><label className="a-label" htmlFor="nl-cta-label">Texto del botón <span className="a-optional">(opcional)</span></label><input id="nl-cta-label" className="a-input" maxLength={60} placeholder="Ver novedades" value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} /></div><div className="a-field"><label className="a-label" htmlFor="nl-cta-url">Enlace del botón <span className="a-optional">(opcional)</span></label><input id="nl-cta-url" type="url" className="a-input" placeholder="https://…" value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} /></div></div>
      <div className="a-field"><label className="a-label" htmlFor="nl-date">Programar envío <span className="a-optional">(opcional)</span></label><input id="nl-date" type="datetime-local" className="a-input" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} /><p className="a-hint">Se guarda la fecha, pero el envío automático requiere configurar un programador externo.</p></div>
      {notice && <p className="a-hint" role="status">{notice}</p>}
      <div className="a-pagehead__actions">
        {id && <button className="a-btn" type="button" onClick={reset} disabled={busy}>Cancelar edición</button>}
        <button className="a-btn a-btn--primary" type="button" onClick={save} disabled={busy || !subject.trim() || (!body.trim() && !productsText.trim() && !promoText.trim())}>{id ? "Guardar cambios" : scheduledAt ? "Programar campaña" : "Guardar borrador"}</button>
      </div>
    </section>
    <section className="a-card a-stack"><div><h2 className="a-card__title">Campañas</h2><p className="a-hint">Suscriptores registrados: {subscribers}</p></div>
      {campaigns.length === 0 ? <p className="a-muted">Todavía no hay campañas.</p> : campaigns.map(c => <article key={c.id} className="a-card a-stack" style={{ padding: 16 }}>
        <div><strong>{c.subject}</strong><p className="a-hint">{c.status}{c.scheduledAt ? ` · ${new Date(c.scheduledAt).toLocaleString("es-CL")}` : ""}{c.sentAt ? ` · enviada ${new Date(c.sentAt).toLocaleString("es-CL")}` : ""}</p>{c.lastError && <p className="a-error">{c.lastError}</p>}</div>
        <p className="a-hint" style={{ whiteSpace: "pre-wrap" }}>{c.body}</p>
        <div className="a-pagehead__actions"><button type="button" className="a-btn" onClick={() => { setId(c.id); setSubject(c.subject); setBody(c.body); setProductsText(c.productsText ?? ""); setPromoText(c.promoText ?? ""); setCtaLabel(c.ctaLabel ?? ""); setCtaUrl(c.ctaUrl ?? ""); setScheduledAt(localValue(c.scheduledAt)); setNotice(`Editando: ${c.subject}`); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button>{c.status !== "enviada" && (!c.scheduledAt || new Date(c.scheduledAt) > new Date()) && <button type="button" className="a-btn" disabled={busy} onClick={() => { if (!confirm(`¿Eliminar la campaña “${c.subject}”?`)) return; start(async () => { const result = await deleteCampaignAction(c.id); setNotice(result.ok ? "Campaña eliminada." : result.error); if (id === c.id) reset(); router.refresh(); }); }}>Eliminar</button>}</div>
      </article>)}
    </section>
    <section className="a-card a-stack"><div><h2 className="a-card__title">Probar newsletter</h2><p className="a-hint">Envía el asunto y mensaje actuales a una dirección para comprobar cómo llegan.</p></div>
      <div className="a-field"><label className="a-label" htmlFor="nl-test-recipient">Destinatario de prueba</label><input id="nl-test-recipient" type="email" className="a-input" list="nl-subscriber-list" placeholder="correo@ejemplo.com" value={testRecipient} onChange={e => setTestRecipient(e.target.value)} /><datalist id="nl-subscriber-list">{subscriberRows.map(s => <option key={s.id} value={s.email} />)}</datalist></div>
      <p className="a-hint">Puedes elegir un suscriptor existente o escribir cualquier correo. Se envía solo a esa dirección.</p>
      <button type="button" className="a-btn" onClick={sendTest} disabled={busy || !testRecipient.trim() || !subject.trim() || (!body.trim() && !productsText.trim() && !promoText.trim())}>{busy ? "Enviando…" : "Enviar correo de prueba"}</button>
    </section>
    <section className="a-card a-stack"><div><h2 className="a-card__title">Lista de correos</h2><p className="a-hint">Se conservan las fechas de alta y baja para mantener el historial de consentimiento.</p></div>
      {subscriberHistory.length === 0 ? <p className="a-muted">Aún no hay correos registrados.</p> : subscriberHistory.map(s => <div key={s.id} className="a-row"><span className="a-row__main"><strong className="a-row__title">{s.email}</strong><span className="a-row__meta">Suscripción: {new Date(s.subscribedAt).toLocaleDateString("es-CL")}{s.unsubscribedAt ? ` · Baja: ${new Date(s.unsubscribedAt).toLocaleDateString("es-CL")}` : ""}</span></span><span className={`a-pill ${s.status === "suscrito" ? "a-pill--ok" : "a-pill--plain"}`}>{s.status === "suscrito" ? "Suscrito" : "Dado de baja"}</span></div>)}
    </section>
  </div>;
}
