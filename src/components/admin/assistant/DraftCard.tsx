"use client";

import { useState, useTransition } from "react";
import { DRAFT_KINDS, type Draft } from "@/domain/assistant";
import { saveDescriptionAction } from "@/app/admin/_actions/assistant";
import { CheckIcon } from "../../icons";

function fullText(d: Draft): string {
  return d.hashtags.length ? `${d.text}\n\n${d.hashtags.map((h) => `#${h}`).join(" ")}` : d.text;
}

/** Texto listo para copiar y pegar (Instagram, WhatsApp, postulación…). */
export function DraftCard({ draft }: { draft: Draft }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const text = fullText(draft);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Sin permiso para el portapapeles: se puede seleccionar el texto a mano.
    }
  }

  return (
    <article className="a-draft">
      <header className="a-draft__head">
        <strong>{draft.title}</strong>
        <span className="a-muted a-small">
          {DRAFT_KINDS[draft.kind]} · {text.length.toLocaleString("es-CL")} caracteres
        </span>
      </header>
      <p className="a-draft__text">{draft.text}</p>
      {draft.hashtags.length > 0 && (
        <p className="a-draft__tags">
          {draft.hashtags.map((h) => (
            <span key={h}>#{h}</span>
          ))}
        </p>
      )}
      <div className="a-draft__actions">
        <button type="button" className="a-btn a-btn--primary a-btn--sm" onClick={copy}>
          {copied ? (
            <>
              <CheckIcon size={17} /> Copiado
            </>
          ) : (
            "Copiar texto"
          )}
        </button>
        {draft.kind === "descripcion" && draft.productId && (
          <button
            type="button"
            className="a-btn a-btn--ghost a-btn--sm"
            disabled={pending || saved}
            onClick={() =>
              start(async () => {
                await saveDescriptionAction(draft.productId!, draft.text);
                setSaved(true);
              })
            }
          >
            {saved ? "Guardada en el producto" : pending ? "Guardando…" : "Usar como descripción del producto"}
          </button>
        )}
      </div>
    </article>
  );
}
