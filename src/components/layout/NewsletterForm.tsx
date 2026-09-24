"use client";

import { useActionState } from "react";
import { type NewsletterState, subscribeAction } from "@/app/(tienda)/_actions/newsletter";

export function NewsletterForm() {
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribeAction, {});

  return (
    <div className="newsletter">
      <h2 className="footer-title">Suscríbete al newsletter</h2>
      <p>Novedades del taller, piezas nuevas y ferias, directo a tu correo.</p>
      {state.ok ? (
        <p className="newsletter__ok" role="status">
          ¡Listo! Te avisaremos de las novedades.
        </p>
      ) : (
        <form action={action} className="newsletter__form">
          <label htmlFor="newsletter-email" className="sr-only">
            Tu correo
          </label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            className="newsletter__input"
            placeholder="tu@correo.cl"
            autoComplete="email"
            required
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? "newsletter-error" : undefined}
          />
          <button type="submit" className="btn btn--light newsletter__btn" disabled={pending}>
            {pending ? "Enviando…" : "Suscribirme"}
          </button>
        </form>
      )}
      {state.error && (
        <p id="newsletter-error" className="newsletter__error">
          {state.error}
        </p>
      )}
    </div>
  );
}
