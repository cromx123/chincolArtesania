import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { META_WEBHOOK_PATH, metaStatus } from "@/config/meta";
import { MetaBotCard } from "@/components/admin/assistant/MetaBotCard";
import { ASSISTANT_TASKS, taskInfo } from "@/domain/assistant";
import { dayLabel } from "@/lib/dates";
import { assistantService, isAssistantConfigured } from "@/server/assistant/assistant-service";
import { PageHeader } from "@/components/admin/PageHeader";
import { ArrowRightIcon } from "@/components/icons";
import { TaskIcon } from "@/components/admin/assistant/TaskIcon";

export const metadata: Metadata = { title: "Asistencia" };

export default async function AssistantHome() {
  const conversations = await assistantService.list();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "tu-dominio.cl";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const webhookUrl = `${proto}://${host}${META_WEBHOOK_PATH}`;

  return (
    <div className="a-page">
      <PageHeader title="Asistencia" subtitle="Te ayuda con lo que hay que escribir: publicaciones, postulaciones, respuestas" />

      {!isAssistantConfigured() && (
        <p className="a-hint a-hint--warn">
          La asistencia necesita una clave de IA para funcionar. Quien instaló el sistema debe agregar ANTHROPIC_API_KEY en el archivo .env.local.
        </p>
      )}

      <section aria-label="¿Con qué te ayudo?">
        <h2 className="a-section-title">¿Con qué te ayudo?</h2>
        <div className="a-tasks">
          {ASSISTANT_TASKS.map((t) => (
            <Link key={t.id} href={`/admin/asistencia/nueva?tarea=${t.id}`} className="a-task">
              <span className="a-task__icon">
                <TaskIcon task={t.id} />
              </span>
              <span className="a-task__text">
                <strong>{t.name}</strong>
                <span>{t.hint}</span>
              </span>
              <ArrowRightIcon />
            </Link>
          ))}
        </div>
      </section>

      <MetaBotCard status={metaStatus()} webhookUrl={webhookUrl} />

      {conversations.length > 0 && (
        <section className="a-card a-card--flush">
          <h2 className="a-card__title a-card__title--pad">Recientes</h2>
          <div className="a-rows">
            {conversations.map((c) => (
              <Link key={c.id} href={`/admin/asistencia/${c.id}`} className="a-row">
                <span className="a-row__main">
                  <span className="a-row__title">{c.title}</span>
                  <span className="a-row__meta">
                    {taskInfo(c.task).name} · {dayLabel(c.updatedAt)}
                  </span>
                </span>
                {c.progress && c.progress.total > 0 && (
                  <span className={`a-pill ${c.progress.done === c.progress.total ? "a-pill--ok" : "a-pill--warn"}`}>
                    {c.progress.done} de {c.progress.total} listos
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
