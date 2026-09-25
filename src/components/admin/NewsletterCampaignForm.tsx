"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCampaignAction, saveCampaignAction, sendTestNewsletterAction } from "@/app/admin/_actions/newsletter";

type Campaign = { id: string; subject: string; body: string; scheduledAt: Date | null; status: string; sentAt: Date | null; lastError: string | null };
type Subscriber = { id: string; email: string };
const localValue = (date: Date | null) => date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";

export function NewsletterCampaignForm({ campaigns, subscribers, subscriberRows }: { campaigns: Campaign[]; subscribers: number; subscriberRows: Subscriber[] }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notice, setNotice] = useState("");
  const [testRecipient, setTestRecipient] = useState("");
  const [busy, start] = useTransition();
  function reset() { setId(null); setSubject(""); setBody(""); setScheduledAt(""); }
  function save() {
    start(async () => {
      const result = await saveCampaignAction(id, { subject, body, scheduledAt });
      if (!result.ok) { setNotice(result.error); return; }
      setNotice(id ? "Cambios guardados." : "Campaña guardada."); reset(); router.refresh();
    });
  }
  function sendTest() {
    start(async () => {
      const result = await sendTestNewsletterAction({ subject, body, recipient: testRecipient });
      setNotice(result.ok ? `Correo de prueba enviado a ${testRecipient}.` : result.error);
    });
  }
  return <div className="a-stack">
    <section className="a-card a-stack">
      <div><h2 className="a-card__title">Crear campaña</h2><p className="a-hint">Prepara y guarda el mensaje. El envío por correo se añadirá más adelante.</p></div>
      <div className="a-field"><label className="a-label" htmlFor="nl-subject">Asunto</label><input id="nl-subject" className="a-input" maxLength={180} value={subject} onChange={e => setSubject(e.target.value)} /></div>
      <div className="a-field"><label className="a-label" htmlFor="nl-body">Mensaje</label><textarea id="nl-body" className="a-input a-textarea" rows={9} maxLength={12000} value={body} onChange={e => setBody(e.target.value)} /></div>
      <div className="a-field"><label className="a-label" htmlFor="nl-date">Programar envío <span className="a-optional">(opcional)</span></label><input id="nl-date" type="datetime-local" className="a-input" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} /><p className="a-hint">Se guarda la fecha, pero el envío automático requiere configurar un programador externo.</p></div>
      {notice && <p className="a-hint" role="status">{notice}</p>}
      <div className="a-pagehead__actions">
        {id && <button className="a-btn" type="button" onClick={reset} disabled={busy}>Cancelar edición</button>}
        <button className="a-btn a-btn--primary" type="button" onClick={save} disabled={busy || !subject.trim() || !body.trim()}>{id ? "Guardar cambios" : scheduledAt ? "Programar campaña" : "Guardar borrador"}</button>
      </div>
    </section>
    <section className="a-card a-stack"><div><h2 className="a-card__title">Campañas</h2><p className="a-hint">Suscriptores registrados: {subscribers}</p></div>
      {campaigns.length === 0 ? <p className="a-muted">Todavía no hay campañas.</p> : campaigns.map(c => <article key={c.id} className="a-card a-stack" style={{ padding: 16 }}>
        <div><strong>{c.subject}</strong><p className="a-hint">{c.status}{c.scheduledAt ? ` · ${new Date(c.scheduledAt).toLocaleString("es-CL")}` : ""}{c.sentAt ? ` · enviada ${new Date(c.sentAt).toLocaleString("es-CL")}` : ""}</p>{c.lastError && <p className="a-error">{c.lastError}</p>}</div>
        <p className="a-hint" style={{ whiteSpace: "pre-wrap" }}>{c.body}</p>
        <div className="a-pagehead__actions"><button type="button" className="a-btn" onClick={() => { setId(c.id); setSubject(c.subject); setBody(c.body); setScheduledAt(localValue(c.scheduledAt)); setNotice(`Editando: ${c.subject}`); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button>{c.status !== "enviada" && (!c.scheduledAt || new Date(c.scheduledAt) > new Date()) && <button type="button" className="a-btn" disabled={busy} onClick={() => { if (!confirm(`¿Eliminar la campaña “${c.subject}”?`)) return; start(async () => { const result = await deleteCampaignAction(c.id); setNotice(result.ok ? "Campaña eliminada." : result.error); if (id === c.id) reset(); router.refresh(); }); }}>Eliminar</button>}</div>
      </article>)}
    </section>
    <section className="a-card a-stack"><div><h2 className="a-card__title">Probar newsletter</h2><p className="a-hint">Envía el asunto y mensaje actuales a una dirección para comprobar cómo llegan.</p></div>
      <div className="a-field"><label className="a-label" htmlFor="nl-test-recipient">Destinatario de prueba</label><input id="nl-test-recipient" type="email" className="a-input" list="nl-subscriber-list" placeholder="correo@ejemplo.com" value={testRecipient} onChange={e => setTestRecipient(e.target.value)} /><datalist id="nl-subscriber-list">{subscriberRows.map(s => <option key={s.id} value={s.email} />)}</datalist></div>
      <p className="a-hint">Puedes elegir un suscriptor existente o escribir cualquier correo. Se envía solo a esa dirección.</p>
      <button type="button" className="a-btn" onClick={sendTest} disabled={busy || !testRecipient.trim() || !subject.trim() || !body.trim()}>{busy ? "Enviando…" : "Enviar correo de prueba"}</button>
    </section>
  </div>;
}
