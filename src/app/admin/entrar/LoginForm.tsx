"use client";

import { useActionState, useState } from "react";
import { type LoginState, loginAction } from "../_actions/auth";

export function LoginForm({ volver }: { volver: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="a-login__form">
      <input type="hidden" name="volver" value={volver} />
      <label htmlFor="password" className="a-label">
        Contraseña
      </label>
      <div className="a-password">
        <input
          id="password"
          name="password"
          type={show ? "text" : "password"}
          className="a-input"
          autoComplete="current-password"
          required
          autoFocus
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
        />
        <button type="button" className="a-password__toggle" onClick={() => setShow((v) => !v)}>
          {show ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      {state.error && (
        <p id="login-error" className="a-error">
          {state.error}
        </p>
      )}
      <button type="submit" className="a-btn a-btn--primary a-btn--block a-btn--lg" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
      <p className="a-hint a-center">La sesión queda abierta por 30 días en este equipo.</p>
    </form>
  );
}
