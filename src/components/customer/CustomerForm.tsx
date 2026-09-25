"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { CustomerFormErrors, CustomerFormInput } from "@/domain/customer";
import { whatsappLink } from "@/config/site";
import { registerCustomerAction, skipFormAction } from "@/app/(tienda)/_actions/customer";
import { WhatsappIcon } from "../icons";
import { forgetCustomer, loadSavedCustomer, saveCustomer } from "./saved-customer";

const EMPTY: CustomerFormInput = { name: "", phone: "", email: "", comuna: "", newsletter: false, consent: false };

export function CustomerForm({ source, fairName }: { source: string | null; fairName: string | null }) {
  const router = useRouter();
  const [form, setForm] = useState<CustomerFormInput>(EMPTY);
  const [token, setToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<CustomerFormErrors>({});
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Si ya guardó sus datos en este dispositivo, se los mostramos para corregir.
  useEffect(() => {
    const saved = loadSavedCustomer();
    if (!saved) return;
    setToken(saved.token);
    setForm((f) => ({ ...f, name: saved.name, phone: saved.phone, email: saved.email, comuna: saved.comuna }));
  }, []);

  const set = <K extends keyof CustomerFormInput>(key: K, value: CustomerFormInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const result = await registerCustomerAction(form, token, source);
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      saveCustomer({ token: result.token, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), comuna: form.comuna.trim() });
      setDone(form.name.trim().split(" ")[0]);
    });
  }

  function skip() {
    start(async () => {
      await skipFormAction(source);
      router.push("/catalogo");
    });
  }

  if (done) {
    return (
      <div className="signup signup--done" role="status">
        <h2>¡Gracias, {done}!</h2>
        <p>Guardamos tus datos en este dispositivo: la próxima vez tu pedido se completa solo, y si tienes descuentos por ser clienta, se aplican en el carrito.</p>
        <div className="signup__actions">
          <Link href="/catalogo" className="btn btn--primary">
            Ver el catálogo
          </Link>
          <a href={whatsappLink(`Hola, soy ${form.name.trim()}. Me registré${fairName ? ` en ${fairName}` : ""} y quiero hacer una consulta.`)} className="btn btn--ghost" target="_blank" rel="noopener noreferrer">
            <WhatsappIcon size={18} /> Escribir por WhatsApp
          </a>
        </div>
      </div>
    );
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <form className="signup" onSubmit={submit} noValidate>
      <div className="signup__field">
        <label htmlFor="c-nombre">Nombre</label>
        <input id="c-nombre" className="input" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} aria-invalid={errors.name ? true : undefined} />
        {errors.name && <p className="signup__error">{errors.name}</p>}
      </div>

      <div className="signup__field">
        <label htmlFor="c-fono">WhatsApp</label>
        <input
          id="c-fono"
          className="input"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="9 1234 5678"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          aria-invalid={errors.phone ? true : undefined}
        />
        {errors.phone && <p className="signup__error">{errors.phone}</p>}
      </div>

      <div className="signup__row">
        <div className="signup__field">
          <label htmlFor="c-correo">
            Correo <span className="muted">(opcional)</span>
          </label>
          <input
            id="c-correo"
            className="input"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            aria-invalid={errors.email ? true : undefined}
          />
          {errors.email && <p className="signup__error">{errors.email}</p>}
        </div>
        <div className="signup__field">
          <label htmlFor="c-comuna">
            Comuna <span className="muted">(opcional)</span>
          </label>
          <input id="c-comuna" className="input" autoComplete="address-level2" value={form.comuna} onChange={(e) => set("comuna", e.target.value)} />
        </div>
      </div>

      <label className="check">
        <input type="checkbox" checked={form.newsletter} onChange={(e) => set("newsletter", e.target.checked)} />
        Quiero recibir novedades y ferias por correo
      </label>

      <div className="signup__consent">
        <label className="check">
          <input type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} aria-invalid={errors.consent ? true : undefined} />
          Autorizo a Chincol Artesanía a guardar estos datos para mis pedidos y beneficios.
        </label>
        <p className="muted">
          Solo los usamos para atenderte y darte descuentos; no los compartimos con nadie. Puedes pedir que los borremos cuando quieras escribiéndonos por WhatsApp.
        </p>
        {errors.consent && <p className="signup__error">{errors.consent}</p>}
      </div>

      {errorCount > 0 && (
        <p className="signup__error" role="alert">
          Revisa {errorCount === 1 ? "el dato marcado" : "los datos marcados"}.
        </p>
      )}

      <div className="signup__actions">
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? "Guardando…" : token ? "Actualizar mis datos" : "Guardar mis datos"}
        </button>
        <button type="button" className="btn btn--ghost" onClick={skip} disabled={pending}>
          Continuar sin guardar
        </button>
      </div>

      {token && (
        <button
          type="button"
          className="signup__forget"
          onClick={() => {
            forgetCustomer();
            setToken(null);
            setForm(EMPTY);
          }}
        >
          No soy {form.name.split(" ")[0] || "yo"} / olvidar mis datos en este dispositivo
        </button>
      )}
    </form>
  );
}
