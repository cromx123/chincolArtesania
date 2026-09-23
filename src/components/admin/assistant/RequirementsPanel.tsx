"use client";

import { useEffect, useState, useTransition } from "react";
import { type Requirement, requirementsProgress } from "@/domain/assistant";
import { updateRequirementsAction } from "@/app/admin/_actions/assistant";
import { CheckIcon, CloseIcon, PlusIcon } from "../../icons";

type Props = {
  conversationId: string | null;
  requirements: Requirement[] | null;
  fairName: string | null;
  fairDeadline: string | null;
};

/** Panel de la postulación: qué pide la feria y qué ya está listo. Ella lo puede editar a mano. */
export function RequirementsPanel({ conversationId, requirements, fairName, fairDeadline }: Props) {
  const [list, setList] = useState<Requirement[]>(requirements ?? []);
  const [draft, setDraft] = useState("");
  const [, start] = useTransition();

  // Cuando la IA actualiza el panel, se muestra lo nuevo.
  useEffect(() => setList(requirements ?? []), [requirements]);

  function save(next: Requirement[]) {
    setList(next);
    if (conversationId) start(() => updateRequirementsAction(conversationId, next));
  }

  const { done, total } = requirementsProgress(list);

  return (
    <div className="a-reqs">
      <div className="a-reqs__head">
        <span className="a-stat__label">Requisitos de la postulación</span>
        <strong className="a-reqs__fair">{fairName ?? "Feria sin nombre aún"}</strong>
        {fairDeadline && <span className="a-muted a-small">Cierre de postulación: {fairDeadline}</span>}
      </div>

      {total > 0 ? (
        <>
          <div className="a-reqs__progress">
            <span>
              <strong>
                {done} de {total}
              </strong>{" "}
              requisitos listos
            </span>
            <span className="a-bars__track">
              <span className="a-bars__fill" style={{ width: `${(done / total) * 100}%` }} />
            </span>
          </div>
          <ul className="a-reqs__list">
            {list.map((r) => (
              <li key={r.id} className={`a-req a-req--${r.status}`}>
                <button
                  type="button"
                  className="a-req__check"
                  aria-pressed={r.status === "listo"}
                  aria-label={r.status === "listo" ? `Marcar como pendiente: ${r.text}` : `Marcar como listo: ${r.text}`}
                  onClick={() => save(list.map((x) => (x.id === r.id ? { ...x, status: x.status === "listo" ? "falta" : "listo" } : x)))}
                >
                  {r.status === "listo" && <CheckIcon size={16} />}
                </button>
                <span className="a-req__text">
                  <strong>{r.text}</strong>
                  {r.note && <span>{r.note}</span>}
                </span>
                <button type="button" className="a-icon-btn a-req__remove" aria-label={`Quitar ${r.text}`} onClick={() => save(list.filter((x) => x.id !== r.id))}>
                  <CloseIcon size={16} />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="a-hint">Cuando me pases las bases, acá aparece la lista de lo que piden y qué ya tienes.</p>
      )}

      {conversationId && (
        <form
          className="a-reqs__add"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            save([...list, { id: `m${Date.now()}`, text: draft.trim(), status: "falta" }]);
            setDraft("");
          }}
        >
          <label htmlFor="nuevo-req" className="sr-only">
            Agregar un requisito
          </label>
          <input id="nuevo-req" className="a-input" placeholder="Agregar un requisito" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <button type="submit" className="a-icon-btn" aria-label="Agregar requisito" disabled={!draft.trim()}>
            <PlusIcon />
          </button>
        </form>
      )}
    </div>
  );
}
