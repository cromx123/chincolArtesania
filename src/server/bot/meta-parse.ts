// Extrae mensajes de texto de los payloads del webhook de Meta (WhatsApp Cloud
// API e Instagram Messaging). Se ignoran los eventos que no son texto (fotos,
// recibos de lectura, "echo" de mensajes propios, etc.): no hay nada que responder.

export interface MetaEvent {
  object?: string;
  entry?: {
    changes?: { value?: { messages?: { from?: string; type?: string; text?: { body?: string } }[] } }[];
    messaging?: { sender?: { id?: string }; message?: { text?: string; is_echo?: boolean } }[];
  }[];
}

export interface IncomingMetaMessage {
  channel: "whatsapp" | "instagram";
  externalId: string;
  text: string;
}

export function parseMetaEvent(event: MetaEvent): IncomingMetaMessage[] {
  const out: IncomingMetaMessage[] = [];
  for (const entry of event.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const m of change.value?.messages ?? []) {
        const text = m.type === "text" ? m.text?.body?.trim() : undefined;
        if (m.from && text) out.push({ channel: "whatsapp", externalId: m.from, text });
      }
    }
    for (const m of entry.messaging ?? []) {
      const text = m.message?.text?.trim();
      if (m.sender?.id && text && !m.message?.is_echo) out.push({ channel: "instagram", externalId: m.sender.id, text });
    }
  }
  return out;
}
