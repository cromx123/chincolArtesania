"use client";

import { useEffect, useRef, useState } from "react";
import { ChatIcon, CloseIcon } from "../icons";

const SESSION_KEY = "chincol.chat.sessionId";

type ChatMessage = { role: "user" | "assistant" | "notice"; text: string };

function getSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    // Sin localStorage (modo privado, etc.): la sesión no sobrevive un recargo.
    return crypto.randomUUID();
  }
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "¡Hola! Soy la asistente de Chincol Artesanía. Pregúntame por el catálogo, precios, stock o pide una cotización." },
  ]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const sessionId = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionId.current = getSessionId();
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  async function send() {
    const value = text.trim();
    if (!value || sending || !sessionId.current) return;
    setText("");
    setMessages((m) => [...m, { role: "user", text: value }]);
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId.current, text: value }),
      });
      const data = (await res.json()) as { ok: boolean; reply?: string; error?: string };
      setMessages((m) => [...m, { role: data.ok ? "assistant" : "notice", text: data.ok ? (data.reply ?? "") : (data.error ?? "Algo salió mal.") }]);
    } catch {
      setMessages((m) => [...m, { role: "notice", text: "No pudimos enviar tu mensaje. Revisa tu conexión e intenta de nuevo." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-widget__panel" role="dialog" aria-label="Chat con Chincol Artesanía">
          <div className="chat-widget__header">
            <span>Chincol Artesanía · Asistente</span>
            <button type="button" className="chat-widget__close" onClick={() => setOpen(false)} aria-label="Cerrar chat">
              <CloseIcon size={18} />
            </button>
          </div>
          <div className="chat-widget__messages" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble chat-bubble--${m.role}`}>
                {m.text}
              </div>
            ))}
            {sending && <div className="chat-bubble chat-bubble--assistant chat-bubble--typing">Escribiendo…</div>}
          </div>
          <p className="chat-widget__disclaimer">Las cotizaciones son estimadas; la artesana confirma el precio final.</p>
          <form
            className="chat-widget__form"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              className="chat-widget__input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe tu mensaje…"
              disabled={sending}
              aria-label="Tu mensaje"
            />
            <button type="submit" className="chat-widget__send" disabled={sending || !text.trim()}>
              Enviar
            </button>
          </form>
        </div>
      )}
      <button type="button" className="chat-widget__toggle" onClick={() => setOpen((v) => !v)} aria-label={open ? "Cerrar chat" : "Abrir chat"}>
        {open ? <CloseIcon size={22} /> : <ChatIcon size={22} />}
      </button>
    </div>
  );
}
