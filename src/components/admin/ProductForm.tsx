"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CATEGORIES, type CategoryId, LEATHER_COLORS, THREAD_COLORS } from "@/domain/product";
import { type Material, unitShort } from "@/domain/material";
import { recipeCost, unitsPossible } from "@/domain/production";
import { formatPrice } from "@/lib/format";
import { deleteProductAction, saveProductAction } from "@/app/admin/_actions/products";
import type { FieldErrors, ProductInput } from "@/server/services/product-admin-service";
import { CalculatorIcon, PlusIcon, TrashIcon } from "../icons";
import { ConfirmButton } from "./ConfirmButton";
import { Choice, MoneyInput, QuantityInput, Stepper } from "./inputs";
import { Notice } from "./Notice";
import { PhotoManager } from "./PhotoManager";

type Props = {
  id: string | null;
  initial: ProductInput;
  materials: Material[];
};

export const EMPTY_PRODUCT: ProductInput = {
  name: "",
  category: "",
  description: "",
  price: 0,
  stock: 0,
  lowStockAlert: 2,
  madeToOrder: false,
  leatherColors: [],
  threadColors: [],
  engraving: false,
  images: [],
  measures: "",
  materialsText: "",
  care: "",
  featured: false,
  published: true,
  recipe: [],
};

const HOW = [
  { id: "hecho", name: "Tengo piezas hechas" },
  { id: "pedido", name: "Lo hago cuando lo piden" },
] as const;

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function ProductForm({ id, initial, materials }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<ProductInput>(initial);
  const [saved, setSaved] = useState<ProductInput>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  // Avisa antes de salir si quedaron cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const recipeLines = useMemo(
    () =>
      form.recipe
        .map((r) => ({ material: materials.find((m) => m.id === r.materialId)!, quantity: r.quantity }))
        .filter((l) => l.material),
    [form.recipe, materials],
  );
  const cost = recipeCost(recipeLines);
  const canMake = unitsPossible(recipeLines);
  const unusedMaterials = materials.filter((m) => !form.recipe.some((r) => r.materialId === m.id));

  function save() {
    start(async () => {
      const result = await saveProductAction(id, form);
      if (!result.ok) {
        setErrors(result.errors);
        document.querySelector("[aria-invalid='true']")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      setErrors({});
      setSaved(form);
      if (!id) {
        router.push(`/admin/productos?aviso=creado`);
      } else {
        setNotice("Cambios guardados.");
        router.refresh();
      }
    });
  }

  const errorCount = Object.keys(errors).length;

  return (
    <div className="a-form a-form--with-bar a-product-form">
      <Notice message={notice} />

      <section className="a-card">
        <h2 className="a-card__title">Fotos</h2>
        <PhotoManager images={form.images} onChange={(images) => set("images", images)} />
      </section>

      <section className="a-card">
        <h2 className="a-card__title">Lo básico</h2>
        <div className="a-field">
          <label htmlFor="nombre" className="a-label">
            Nombre de la pieza
          </label>
          <input
            id="nombre"
            className="a-input"
            placeholder="Ej: Bolso Maletín Andes"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            aria-invalid={errors.name ? true : undefined}
          />
          {errors.name && <p className="a-error">{errors.name}</p>}
        </div>

        <div className="a-field" aria-invalid={errors.category ? true : undefined}>
          <span className="a-label">Categoría</span>
          <Choice label="Categoría" options={CATEGORIES} value={(form.category || null) as CategoryId | null} onChange={(v) => set("category", v)} columns={3} />
          {errors.category && <p className="a-error">{errors.category}</p>}
        </div>

        <div className="a-field">
          <label htmlFor="descripcion" className="a-label">
            Descripción <span className="a-optional">(la verán tus clientes)</span>
          </label>
          <textarea
            id="descripcion"
            className="a-input a-textarea"
            rows={4}
            placeholder="Cómo está hecha, qué cuero usa, para qué sirve…"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
      </section>

      <section className="a-card" aria-invalid={errors.recipe ? true : undefined}>
        <h2 className="a-card__title">¿Qué materiales usa cada pieza?</h2>
        <p className="a-hint">
          Anótalos primero: así sabrás cuánto te cuesta cada pieza antes de ponerle precio, y cuando hagas más se descuentan solos.
        </p>

        {form.recipe.length > 0 && (
          <ul className="a-recipe">
            {form.recipe.map((r, i) => {
              const m = materials.find((x) => x.id === r.materialId);
              if (!m) return null;
              return (
                <li key={r.materialId} className="a-recipe__row">
                  <select
                    className="a-input"
                    aria-label="Material"
                    value={r.materialId}
                    onChange={(e) =>
                      set(
                        "recipe",
                        form.recipe.map((x, n) => (n === i ? { ...x, materialId: e.target.value } : x)),
                      )
                    }
                  >
                    {[m, ...unusedMaterials].map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                  <QuantityInput
                    id={`cant-${r.materialId}`}
                    aria-label={`Cantidad de ${m.name}`}
                    value={r.quantity}
                    suffix={unitShort(m.unit)}
                    onChange={(v) => set("recipe", form.recipe.map((x, n) => (n === i ? { ...x, quantity: v } : x)))}
                  />
                  <span className="a-recipe__cost">{formatPrice(Math.round(r.quantity * m.unitCost))}</span>
                  <button
                    type="button"
                    className="a-icon-btn"
                    aria-label={`Quitar ${m.name}`}
                    onClick={() => set("recipe", form.recipe.filter((_, n) => n !== i))}
                  >
                    <TrashIcon />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {errors.recipe && <p className="a-error">{errors.recipe}</p>}

        {unusedMaterials.length > 0 ? (
          <button
            type="button"
            className="a-add"
            onClick={() => set("recipe", [...form.recipe, { materialId: unusedMaterials[0].id, quantity: 1 }])}
          >
            <PlusIcon /> Agregar material
          </button>
        ) : materials.length === 0 ? (
          <p className="a-hint">
            Primero anota tus materiales en <Link href="/admin/materiales" className="a-link">Materiales</Link>.
          </p>
        ) : null}

        {recipeLines.length > 0 && (
          <div className="a-recipe__summary">
            <span>
              Materiales por pieza: <strong>{formatPrice(cost)}</strong>
            </span>
            {canMake !== null && (
              <span>
                Con lo que tienes alcanza para <strong>{canMake === 1 ? "1 pieza" : `${canMake} piezas`}</strong>
              </span>
            )}
          </div>
        )}
      </section>

      <section className="a-card">
        <h2 className="a-card__title">Precio y stock</h2>
        <div className="a-field">
          <label htmlFor="precio" className="a-label">
            Precio de venta
          </label>
          <MoneyInput id="precio" value={form.price} onChange={(v) => set("price", v)} invalid={Boolean(errors.price)} placeholder="0" />
          {errors.price && <p className="a-error">{errors.price}</p>}
          {cost > 0 && (
            <p className={`a-hint${form.price > 0 && form.price <= cost ? " a-hint--warn" : ""}`}>
              {form.price > 0 && form.price <= cost
                ? `Ojo: solo en materiales gastas ${formatPrice(cost)}. Con este precio pierdes plata.`
                : `Solo en materiales gastas ${formatPrice(cost)} por pieza${form.price > cost ? ` (te quedan ${formatPrice(form.price - cost)} para tu trabajo y ganancia)` : ""}.`}
            </p>
          )}
          {id && (
            <Link href={`/admin/calculadora?producto=${id}`} className="a-link a-small">
              <CalculatorIcon size={16} /> ¿No sabes cuánto cobrar? Calcúlalo
            </Link>
          )}
        </div>

        <div className="a-field">
          <span className="a-label">¿Cómo lo vendes?</span>
          <Choice label="Cómo lo vendes" options={HOW} value={form.madeToOrder ? "pedido" : "hecho"} onChange={(v) => set("madeToOrder", v === "pedido")} columns={2} />
        </div>

        {!form.madeToOrder && (
          <div className="a-grid-2">
            <div className="a-field">
              <span className="a-label">Piezas hechas ahora</span>
              <Stepper label="Piezas hechas" value={form.stock} onChange={(v) => set("stock", v)} />
            </div>
            <div className="a-field">
              <span className="a-label">Avisarme cuando queden</span>
              <Stepper label="Aviso de stock bajo" value={form.lowStockAlert} onChange={(v) => set("lowStockAlert", v)} />
            </div>
          </div>
        )}
      </section>

      <section className="a-card">
        <h2 className="a-card__title">¿Qué puede elegir el cliente?</h2>
        <div className="a-field">
          <span className="a-label">Colores de cuero disponibles</span>
          <div className="a-swatches">
            {LEATHER_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="a-swatch"
                aria-pressed={form.leatherColors.includes(c.id)}
                onClick={() => set("leatherColors", toggle(form.leatherColors, c.id))}
              >
                <span className="a-swatch__dot" style={{ background: c.hex }} />
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <div className="a-field">
          <span className="a-label">Colores de hilo disponibles</span>
          <div className="a-swatches">
            {THREAD_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="a-swatch"
                aria-pressed={form.threadColors.includes(c.id)}
                onClick={() => set("threadColors", toggle(form.threadColors, c.id))}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <label className="a-check-card">
          <input type="checkbox" checked={form.engraving} onChange={(e) => set("engraving", e.target.checked)} />
          <span>
            <strong>Puede grabar sus iniciales</strong>
            <span className="a-muted">Aparece un campo de hasta 3 letras en la tienda.</span>
          </span>
        </label>
      </section>

      <section className="a-card">
        <details className="a-more">
          <summary>Más detalles para la tienda (opcional)</summary>
          <div className="a-field">
            <label htmlFor="medidas" className="a-label">
              Medidas
            </label>
            <input id="medidas" className="a-input" placeholder="Ej: 38 × 28 × 10 cm" value={form.measures} onChange={(e) => set("measures", e.target.value)} />
          </div>
          <div className="a-field">
            <label htmlFor="materiales-texto" className="a-label">
              Materiales (como lo leerá el cliente)
            </label>
            <input
              id="materiales-texto"
              className="a-input"
              placeholder="Ej: Cuero de curtido vegetal, hilo encerado"
              value={form.materialsText}
              onChange={(e) => set("materialsText", e.target.value)}
            />
          </div>
          <div className="a-field">
            <label htmlFor="cuidado" className="a-label">
              Cuidados
            </label>
            <input id="cuidado" className="a-input" placeholder="Ej: Limpiar con paño seco" value={form.care} onChange={(e) => set("care", e.target.value)} />
          </div>
        </details>
      </section>

      <section className="a-card">
        <h2 className="a-card__title">En la tienda</h2>
        <label className="a-check-card">
          <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} />
          <span>
            <strong>Mostrar en la tienda</strong>
            <span className="a-muted">Si lo desmarcas, nadie lo ve, pero puedes seguir registrando ventas.</span>
          </span>
        </label>
        <label className="a-check-card">
          <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
          <span>
            <strong>Destacar en la portada</strong>
            <span className="a-muted">Aparece en “Piezas del taller” al entrar a la tienda.</span>
          </span>
        </label>
      </section>

      {id && (
        <ConfirmButton
          label="Eliminar este producto"
          confirmLabel="Sí, eliminar"
          warning="Se borra de la tienda con sus fotos. Las ventas ya registradas no se pierden. Si solo quieres esconderlo, desmarca “Mostrar en la tienda”."
          onConfirm={() => deleteProductAction(id)}
        />
      )}

      <div className="a-bar">
        {errorCount > 0 && (
          <p className="a-error" role="alert">
            Falta completar {errorCount === 1 ? "un dato" : `${errorCount} datos`} (marcados en rojo).
          </p>
        )}
        <div className="a-bar__row">
          <span className="a-muted a-small">{dirty ? "Tienes cambios sin guardar" : id ? "Todo guardado" : ""}</span>
          <button type="button" className="a-btn a-btn--primary a-btn--lg" onClick={save} disabled={pending || (!dirty && Boolean(id))}>
            {pending ? "Guardando…" : id ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>
      </div>
    </div>
  );
}
