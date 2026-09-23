"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { type AssistantTask, type ChatItem, type ConversationView, type PickerProduct, requirementsProgress, taskInfo } from "@/domain/assistant";
import { deleteConversationAction, sendAssistantMessageAction } from "@/app/admin/_actions/assistant";
import { ArrowLeftIcon, ArrowRightIcon, ChincolBird, CloseIcon, PlusIcon, SearchIcon } from "../../icons";
import { ConfirmButton } from "../ConfirmButton";
import { ProductThumb } from "../ProductThumb";
import { Sheet } from "../Sheet";
import { DraftCard } from "./DraftCard";
import { RequirementsPanel } from "./RequirementsPanel";
import { TaskIcon } from "./TaskIcon";

const BEFORE_PUBLISHING = [
  "El stock que menciona coincide con lo que tienes",
  "La foto es de la pieza correcta",
  "El plazo de despacho que se ofrece es el real",
];

const WAITING = ["Revisando tus productos…", "Pensando cómo decirlo…", "Escribiendo el borrador…"];

type Props = {
  task: AssistantTask;
  initial: ConversationView | null;
  configured: boolean;
  /** Solo en "Describir un producto": lista para el botón "Elegir producto". */
  products?: PickerProduct[];
};

function normalize(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Lista para elegir qué producto describir, con su descripción actual. */
function ProductPicker({ products, onPick }: { products: PickerProduct[]; onPick: (p: PickerProduct) => void }) {
  const [query, setQuery] = useState("");
  const q = normalize(query.trim());
  const visible = q ? products.filter((p) => normalize(p.name).includes(q)) : products;

  return (
    <>
      <div className="a-search">
        <SearchIcon size={18} />
        <input type="search" className="a-input" placeholder="Buscar por nombre…" aria-label="Buscar producto" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="a-picker">
        {visible.length === 0 && <p className="a-muted a-center">No hay productos con ese nombre.</p>}
        {visible.map((p) => (
          <button key={p.id} type="button" className="a-picker__item" onClick={() => onPick(p)}>
            <ProductThumb image={p.image} category={p.category} />
            <span className="a-picker__info">
              <strong>{p.name}</strong>
              <span className="a-muted a-picker__desc">{p.description ? p.description : "Todavía no tiene descripción"}</span>
            </span>
            <ArrowRightIcon />
          </button>
        ))}
      </div>
    </>
  );
}

function SidePanel({ task, view }: { task: AssistantTask; view: ConversationView | null }) {
  const [checked, setChecked] = useState<number[]>([]);

  if (task === "feria") {
    return (
      <RequirementsPanel
        conversationId={view?.id ?? null}
        requirements={view?.requirements ?? null}
        fairName={view?.fairName ?? null}
        fairDeadline={view?.fairDeadline ?? null}
      />
    );
  }

  return (
    <div className="a-stack">
      <section className="a-side-card">
        <h2 className="a-stat__label">Datos que usó</h2>
        {view?.usedProducts.length ? (
          <ul className="a-used">
            {view.usedProducts.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/productos/${p.id}`} className="a-link">
                  {p.name} <ArrowRightIcon size={15} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="a-hint">Acá verás qué productos revisó para escribir, así puedes comprobar los datos.</p>
        )}
      </section>
      {task === "publicacion" && (
        <section className="a-side-card">
          <h2 className="a-stat__label">Antes de publicar</h2>
          <ul className="a-checklist">
            {BEFORE_PUBLISHING.map((text, i) => (
              <li key={text}>
                <label>
                  <input
                    type="checkbox"
                    checked={checked.includes(i)}
                    onChange={() => setChecked((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]))}
                  />
                  {text}
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Bubble({ item }: { item: ChatItem }) {
  if (item.kind === "draft") return <DraftCard draft={item.draft} />;
  if (item.kind === "notice") return <p className="a-hint a-hint--warn">{item.text}</p>;
  if (item.kind === "user") {
    return (
      <div className="a-msg a-msg--user">
        {item.attachment && <span className="a-msg__file">PDF · {item.attachment}</span>}
        {item.text && <p>{item.text}</p>}
      </div>
    );
  }
  return (
    <div className="a-msg a-msg--ai">
      <p>{item.text}</p>
    </div>
  );
}

export function AssistantChat({ task, initial, configured, products = [] }: Props) {
  const router = useRouter();
  const info = taskInfo(task);
  const [view, setView] = useState<ConversationView | null>(initial);
  const [text, setText] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [sending, setSending] = useState<{ text: string; attachment?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waitStep, setWaitStep] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, start] = useTransition();
  const logEnd = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const items = view?.items ?? [];
  const lastIsDraft = items.at(-1)?.kind === "draft";
  const progress = view?.requirements ? requirementsProgress(view.requirements) : null;

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items.length, sending]);

  // Mensajes de espera que van cambiando: una respuesta puede tardar varios segundos.
  useEffect(() => {
    if (!sending) return;
    setWaitStep(0);
    const t = setInterval(() => setWaitStep((s) => Math.min(s + 1, WAITING.length - 1)), 6000);
    return () => clearInterval(t);
  }, [sending]);

  function send(message: string, productId?: string) {
    const body = message.trim();
    if ((!body && !pdf) || pending) return;
    const data = new FormData();
    data.set("task", task);
    data.set("conversationId", view?.id ?? "");
    data.set("text", body);
    if (pdf) data.set("pdf", pdf);
    if (productId) data.set("productId", productId);

    setError(null);
    setSending({ text: body, attachment: pdf?.name });
    start(async () => {
      const result = await sendAssistantMessageAction(data);
      setSending(null);
      if (!result.ok) {
        setError(result.error);
        return; // el texto queda en el cuadro para volver a intentar
      }
      setText("");
      setPdf(null);
      setView(result.view);
      if (!view) router.replace(`/admin/asistencia/${result.view.id}`, { scroll: false });
    });
  }

  /** Al elegir un producto se pide la descripción de inmediato; lo escrito en el cuadro va como indicación. */
  function pickProduct(p: PickerProduct) {
    setPickerOpen(false);
    const extra = text.trim();
    send(`Quiero una descripción nueva para ${p.name}.${extra ? ` ${extra}` : ""}`, p.id);
  }

  const panelLabel =task === "feria" ? (progress?.total ? `Requisitos · ${progress.done} de ${progress.total}` : "Requisitos") : "Datos que usó";

  return (
    <div className="a-assist">
      <section className="a-chat" aria-label={info.name}>
        <header className="a-chat__head">
          <Link href="/admin/asistencia" className="a-icon-btn" aria-label="Volver a Asistencia">
            <ArrowLeftIcon />
          </Link>
          <span className="a-chat__icon">
            <TaskIcon task={task} size={20} />
          </span>
          <div className="a-chat__title">
            <h1>{view?.title ?? info.name}</h1>
            <p className="a-muted a-small">{info.hint}</p>
          </div>
          <button type="button" className="a-btn a-btn--ghost a-btn--sm a-chat__panel-btn" onClick={() => setPanelOpen(true)}>
            {panelLabel}
          </button>
        </header>

        <div className="a-chat__log" aria-live="polite">
          <div className="a-msg a-msg--ai">
            <span className="a-msg__avatar" aria-hidden>
              <ChincolBird size={16} />
            </span>
            <p>{info.opener}</p>
          </div>
          {items.map((item, i) => (
            <Bubble key={i} item={item} />
          ))}
          {sending && (
            <>
              <Bubble item={{ kind: "user", text: sending.text, attachment: sending.attachment }} />
              <div className="a-msg a-msg--ai a-msg--typing" role="status">
                <span className="a-dots" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
                {WAITING[waitStep]}
              </div>
            </>
          )}
          {error && (
            <p className="a-error" role="alert">
              {error}
            </p>
          )}
          <div ref={logEnd} />
        </div>

        {lastIsDraft && !sending && (
          <div className="a-followups" aria-label="Ajustes rápidos">
            {info.followUps.map((f) => (
              <button key={f} type="button" className="a-swatch" onClick={() => send(f)} disabled={pending}>
                {f}
              </button>
            ))}
          </div>
        )}

        <form
          className="a-composer"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          {!configured && <p className="a-hint a-hint--warn">Falta configurar la clave de IA (ANTHROPIC_API_KEY).</p>}
          {task === "descripcion" && products.length > 0 && (
            <button
              type="button"
              className={`a-btn a-btn--block ${items.length ? "a-btn--ghost" : "a-btn--primary a-btn--lg"}`}
              onClick={() => setPickerOpen(true)}
              disabled={pending}
            >
              {items.length ? "Describir otro producto" : "Elegir producto"}
            </button>
          )}
          {pdf && (
            <span className="a-composer__file">
              PDF · {pdf.name}
              <button type="button" className="a-icon-btn" aria-label="Quitar el PDF" onClick={() => setPdf(null)}>
                <CloseIcon size={16} />
              </button>
            </span>
          )}
          <div className="a-composer__row">
            {task === "feria" && (
              <>
                <button type="button" className="a-icon-btn a-composer__attach" aria-label="Adjuntar las bases en PDF" onClick={() => fileInput.current?.click()}>
                  <PlusIcon />
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(e) => {
                    setPdf(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </>
            )}
            <label htmlFor="mensaje" className="sr-only">
              Escribe tu mensaje
            </label>
            <textarea
              id="mensaje"
              className="a-input a-composer__input"
              rows={1}
              placeholder={items.length ? "Escribe tu mensaje…" : info.placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(text);
                }
              }}
            />
            <button type="submit" className="a-btn a-btn--primary" disabled={pending || (!text.trim() && !pdf)}>
              {pending ? "…" : "Enviar"}
            </button>
          </div>
        </form>
      </section>

      <aside className="a-assist__side">
        <SidePanel task={task} view={view} />
        {view && (
          <ConfirmButton
            label="Borrar esta conversación"
            confirmLabel="Sí, borrar"
            warning="Se borra la conversación. Los textos que ya copiaste no se pierden."
            onConfirm={() => deleteConversationAction(view.id)}
          />
        )}
      </aside>

      <Sheet open={panelOpen} onClose={() => setPanelOpen(false)} title={panelLabel}>
        <SidePanel task={task} view={view} />
      </Sheet>

      {products.length > 0 && (
        <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="¿Qué producto quieres describir?">
          <ProductPicker products={products} onPick={pickProduct} />
        </Sheet>
      )}
    </div>
  );
}
