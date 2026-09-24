import type { Metadata } from "next";
import { EMPTY_EVENT, isISODate } from "@/domain/event";
import { EventForm } from "@/components/admin/EventForm";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata: Metadata = { title: "Nueva feria o evento" };

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  const { fecha } = await searchParams;
  const startDate = fecha && isISODate(fecha) ? fecha : "";

  return (
    <div className="a-page a-page--narrow">
      <PageHeader title="Nueva feria o evento" back={startDate ? `/admin/calendario?mes=${startDate.slice(0, 7)}` : "/admin/calendario"} />
      <EventForm id={null} initial={{ ...EMPTY_EVENT, startDate }} />
    </div>
  );
}
