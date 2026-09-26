"use client";

import { useTransition } from "react";
import { QUOTE_STATUSES } from "@/domain/bot-quote";
import { setQuoteStatusAction } from "@/app/admin/_actions/quotes";

export function QuoteStatusForm({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();

  return (
    <div className="a-field">
      <label htmlFor="quote-status" className="a-label">
        Estado
      </label>
      <select
        id="quote-status"
        className="a-input"
        value={status}
        disabled={pending}
        onChange={(e) => start(() => setQuoteStatusAction(id, e.target.value))}
      >
        {QUOTE_STATUSES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
