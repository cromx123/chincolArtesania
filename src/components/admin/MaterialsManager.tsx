"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  LEVEL_LABEL,
  MATERIAL_KINDS,
  MATERIAL_UNITS,
  type MaterialKind,
  type MaterialUnit,
  formatAmount,
  formatQuantity,
  materialLevel,
  unitShort,
  unitsPerYard,
} from "@/domain/material";
import { formatPrice, formatUnitPrice } from "@/lib/format";
import {
  deleteMaterialAction,
  purchaseMaterialAction,
  saveMaterialAction,
  setMaterialStockAction,
} from "@/app/admin/_actions/materials";
import type { MaterialWithUse } from "@/server/services/material-service";
import { GridIcon, PlusIcon, SearchIcon, TableIcon } from "../icons";
import { ConfirmButton } from "./ConfirmButton";
import { Choice, MoneyInput, QuantityInput, UnitCostInput, YardsInput } from "./inputs";
import { Notice } from "./Notice";
import { Sheet } from "./Sheet";

type Mode = { kind: "buy" | "count" | "edit"; material: MaterialWithUse } | { kind: "new" } | null;

const FILTERS = [{ id: "todos", name: "Todos" }, { id: "poco", name: "Queda poco" }, ...MATERIAL_KINDS] as const;
type Filter = (typeof FILTERS)[number]["id"];

const UNIT_CHOICES = MATERIAL_UNITS.map((u) => ({ id: u.id, name: u.long.charAt(0).toUpperCase() + u.long.slice(1) }));

function LevelBar({ stock, min }: { stock: number; min: number }) {
  const level = materialLevel({ stock, minStock: min });
  const pct = min > 0 ? Math.min(100, (stock / (min * 2)) * 100) : 100;
  return (
    <div className={`a-level a-level--${level}`}>
      <span className="a-level__track">
        <span className="a-level__fill" style={{ width: `${Math.max(3, pct)}%` }} />
        {min > 0 && <span className="a-level__min" style={{ left: "50%" }} title="Mínimo" />}
      </span>
      <span className="a-level__label">{LEVEL_LABEL[level]}</span>
    </div>
  );
}

/** Cantidad del material: los hilos en cm o m también se pueden escribir en yardas. */
function AmountField({ id, kind, unit, value, onChange, label }: { id: string; kind: MaterialKind | null; unit: MaterialUnit | null; value: number; onChange: (v: number) => void; label: string }) {
  const perYard = unitsPerYard(kind, unit);
  const u = unit ? unitShort(unit) : "";
  return perYard ? (
    // key: al cambiar de unidad se rearma con la conversión nueva.
    <YardsInput key={unit} id={id} label={label} value={value} onChange={onChange} unit={u} perYard={perYard} />
  ) : (
    <QuantityInput id={id} value={value} onChange={onChange} suffix={u} />
  );
}

/** Costo por unidad. En cm se puede escribir por metro (o por yarda, si es hilo), porque así se compra. */
function CostField({ id, kind, unit, value, onChange, label }: { id: string; kind: MaterialKind | null; unit: MaterialUnit | null; value: number; onChange: (v: number) => void; label: string }) {
  const perYard = unitsPerYard(kind, unit);
  const u = unit ? unitShort(unit) : "";
  if (perYard) return <UnitCostInput key={unit} id={id} label={label} value={value} onChange={onChange} unit={u} other="yarda" factor={perYard} />;
  if (unit === "cm") return <UnitCostInput key={unit} id={id} label={label} value={value} onChange={onChange} unit="cm" other="metro" factor={100} />;
  return <MoneyInput id={id} value={value} onChange={onChange} placeholder="0" />;
}

/** "$0,55 por cm", más lo que eso da por yarda en los hilos. */
function costText(m: Pick<MaterialWithUse, "kind" | "unit" | "unitCost">): string {
  const perYard = unitsPerYard(m.kind, m.unit);
  return `${formatUnitPrice(m.unitCost)} por ${unitShort(m.unit)}${perYard ? ` (${formatPrice(m.unitCost * perYard)} por yarda)` : ""}`;
}

/** "9.144 cm", más su equivalente en yardas en los hilos. */
function amountText(m: Pick<MaterialWithUse, "kind" | "unit">, value: number): string {
  const perYard = unitsPerYard(m.kind, m.unit);
  return `${formatAmount(value, m.unit)}${perYard && value > 0 ? ` (${formatQuantity(value / perYard)} yd)` : ""}`;
}

function BuyForm({ m, onDone }: { m: MaterialWithUse; onDone: (msg: string) => void }) {
  const [qty, setQty] = useState(0);
  const [paid, setPaid] = useState(0);
  const [pending, start] = useTransition();
  return (
    <div className="a-form">
      <div className="a-field">
        <label htmlFor="compra-cant" className="a-label">
          ¿Cuánto compraste?
        </label>
        <AmountField id="compra-cant" label="Cantidad comprada" kind={m.kind} unit={m.unit} value={qty} onChange={setQty} />
      </div>
      <div className="a-field">
        <label htmlFor="compra-pago" className="a-label">
          ¿Cuánto pagaste en total? <span className="a-optional">(opcional)</span>
        </label>
        <MoneyInput id="compra-pago" value={paid} onChange={setPaid} placeholder="0" />
        {qty > 0 && paid > 0 && (
          <p className="a-hint">Queda en {costText({ ...m, unitCost: paid / qty })}. Así tus costos quedan al día.</p>
        )}
      </div>
      <button
        type="button"
        className="a-btn a-btn--primary a-btn--lg a-btn--block"
        disabled={!(qty > 0) || pending}
        onClick={() =>
          start(async () => {
            await purchaseMaterialAction(m.id, qty, paid);
            onDone(`Sumamos ${amountText(m, qty)} de ${m.name.toLowerCase()}.`);
          })
        }
      >
        {pending ? "Guardando…" : qty > 0 ? `Sumar ${formatAmount(qty, m.unit)}` : "Sumar"}
      </button>
    </div>
  );
}

function CountForm({ m, onDone }: { m: MaterialWithUse; onDone: (msg: string) => void }) {
  const [value, setValue] = useState(m.stock);
  const [pending, start] = useTransition();
  return (
    <div className="a-form">
      <p className="a-hint">Usa esto cuando cuentes lo que tienes en el taller, o si se perdió algo en un corte.</p>
      <div className="a-field">
        <label htmlFor="contar" className="a-label">
          ¿Cuánto tienes ahora?
        </label>
        <AmountField id="contar" label="Lo que tienes ahora" kind={m.kind} unit={m.unit} value={value} onChange={setValue} />
        <p className="a-hint">Antes decía {amountText(m, m.stock)}.</p>
      </div>
      <button
        type="button"
        className="a-btn a-btn--primary a-btn--lg a-btn--block"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await setMaterialStockAction(m.id, value);
            onDone(`Actualizado: ${amountText(m, value)} de ${m.name.toLowerCase()}.`);
          })
        }
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </div>
  );
}

function EditForm({ m, onDone }: { m: MaterialWithUse | null; onDone: (msg: string) => void }) {
  const [name, setName] = useState(m?.name ?? "");
  const [kind, setKind] = useState<MaterialKind | null>(m?.kind ?? null);
  const [unit, setUnit] = useState<MaterialUnit | null>(m?.unit ?? null);
  const [stock, setStock] = useState(0);
  const [min, setMin] = useState(m?.minStock ?? 0);
  const [cost, setCost] = useState(m?.unitCost ?? 0);
  const [supplier, setSupplier] = useState(m?.supplier ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const u = unit ? unitShort(unit) : "";
  // Con conversor (hilo en yardas, costo por metro) los campos son anchos: van uno bajo el otro.
  const wide = unitsPerYard(kind, unit) !== null || unit === "cm";

  function chooseKind(k: MaterialKind) {
    setKind(k);
    // El hilo se mide en largo: en un material nuevo se propone cm (con conversor de yardas).
    if (k === "hilo" && !m && unit === null) setUnit("cm");
  }

  return (
    <div className="a-form">
      <div className="a-field">
        <label htmlFor="mat-nombre" className="a-label">
          Nombre
        </label>
        <input id="mat-nombre" className="a-input" placeholder="Ej: Cuero curtido 2 mm — café" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="a-field">
        <span className="a-label">Tipo</span>
        <Choice label="Tipo de material" options={MATERIAL_KINDS} value={kind} onChange={chooseKind} columns={3} />
      </div>
      <div className="a-field">
        <span className="a-label">¿En qué lo mides?</span>
        <Choice label="Unidad de medida" options={UNIT_CHOICES} value={unit} onChange={setUnit} columns={2} />
        {unitsPerYard(kind, unit) && <p className="a-hint">Puedes escribir el hilo en yardas o en {u}: el otro se calcula solo (1 yarda = 91,44 cm).</p>}
      </div>
      {!m && (
        <div className="a-field">
          <label htmlFor="mat-stock" className="a-label">
            ¿Cuánto tienes ahora?
          </label>
          <AmountField id="mat-stock" label="Lo que tienes ahora" kind={kind} unit={unit} value={stock} onChange={setStock} />
        </div>
      )}
      <div className={wide ? "a-form" : "a-grid-2"}>
        <div className="a-field">
          <label htmlFor="mat-min" className="a-label">
            Avisarme si baja de
          </label>
          <AmountField id="mat-min" label="Aviso de stock bajo" kind={kind} unit={unit} value={min} onChange={setMin} />
        </div>
        <div className="a-field">
          <label htmlFor="mat-costo" className="a-label">
            {wide ? "Costo" : `Costo por ${u || "unidad"}`}
          </label>
          <CostField id="mat-costo" label="Costo" kind={kind} unit={unit} value={cost} onChange={setCost} />
        </div>
      </div>
      <div className="a-field">
        <label htmlFor="mat-prov" className="a-label">
          ¿Dónde lo compras? <span className="a-optional">(opcional)</span>
        </label>
        <input id="mat-prov" className="a-input" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
      </div>
      {error && <p className="a-error">{error}</p>}
      <button
        type="button"
        className="a-btn a-btn--primary a-btn--lg a-btn--block"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await saveMaterialAction(m?.id ?? null, {
              name,
              kind: kind ?? "",
              unit: unit ?? "",
              stock,
              minStock: min,
              unitCost: cost,
              supplier,
            });
            if (!result.ok) setError(result.error);
            else onDone(m ? "Material actualizado." : "Material agregado.");
          })
        }
      >
        {pending ? "Guardando…" : m ? "Guardar cambios" : "Agregar material"}
      </button>
      {m && (
        <ConfirmButton
          label="Eliminar este material"
          confirmLabel="Sí, eliminar"
          warning={
            m.usedIn.length
              ? `Se quitará también de: ${m.usedIn.join(", ")}.`
              : "Se borra el material y su historial."
          }
          onConfirm={async () => {
            await deleteMaterialAction(m.id);
            onDone("Material eliminado.");
          }}
        />
      )}
    </div>
  );
}

type View = "tarjetas" | "tabla";
const VIEW_KEY = "chincol.admin.materials-view";

type SortKey = "nombre" | "nivel" | "stock" | "costo" | "valor";
const SORT_VALUE: Record<SortKey, (m: MaterialWithUse) => number | string> = {
  nombre: (m) => m.name.toLowerCase(),
  // Cuánto queda respecto al mínimo: lo que más urge comprar queda primero.
  nivel: (m) => (m.minStock > 0 ? m.stock / m.minStock : Number.POSITIVE_INFINITY),
  stock: (m) => m.stock,
  costo: (m) => m.unitCost,
  valor: (m) => m.stock * m.unitCost,
};

function sortMaterials(list: MaterialWithUse[], key: SortKey, asc: boolean) {
  return [...list].sort((a, b) => {
    const x = SORT_VALUE[key](a);
    const y = SORT_VALUE[key](b);
    const cmp = typeof x === "string" ? x.localeCompare(y as string, "es") : x - (y as number);
    return asc ? cmp : -cmp;
  });
}

/** Botones de acción de un material (los mismos en tarjetas y en tabla). */
function MaterialActions({ m, onMode }: { m: MaterialWithUse; onMode: (mode: Mode) => void }) {
  return (
    <>
      <button type="button" className="a-btn a-btn--primary a-btn--sm" onClick={() => onMode({ kind: "buy", material: m })}>
        <PlusIcon size={16} /> Compré más
      </button>
      <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => onMode({ kind: "count", material: m })}>
        Contar
      </button>
      <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => onMode({ kind: "edit", material: m })}>
        Editar
      </button>
    </>
  );
}

function MaterialsTable({ list, onMode }: { list: MaterialWithUse[]; onMode: (mode: Mode) => void }) {
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "nivel", asc: true });
  const rows = sortMaterials(list, sort.key, sort.asc);

  // Encabezado que ordena al tocarlo. Nombre y nivel parten de menor a mayor; montos, de mayor a menor.
  const th = (k: SortKey, label: string, num = false) => {
    const active = sort.key === k;
    return (
      <th scope="col" aria-sort={active ? (sort.asc ? "ascending" : "descending") : "none"} className={num ? "is-num" : undefined}>
        <button type="button" className="a-table__sort" onClick={() => setSort({ key: k, asc: active ? !sort.asc : k === "nombre" || k === "nivel" })}>
          {label}
          <span aria-hidden>{active ? (sort.asc ? "↑" : "↓") : ""}</span>
        </button>
      </th>
    );
  };

  return (
    <div className="a-table-wrap">
      <table className="a-table">
        <thead>
          <tr>
            {th("nombre", "Material")}
            {th("nivel", "Nivel")}
            {th("stock", "Tengo", true)}
            <th scope="col" className="is-num">
              Aviso si baja de
            </th>
            {th("costo", "Costo por unidad", true)}
            {th("valor", "Valor", true)}
            <th scope="col">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} id={`m-${m.id}`} className={`a-table__row--${materialLevel(m)}`}>
              <td>
                <strong>{m.name}</strong>
                <span className="a-table__sub">
                  {MATERIAL_KINDS.find((k) => k.id === m.kind)?.name}
                  {m.supplier && ` · ${m.supplier}`}
                </span>
              </td>
              <td className="a-table__level">
                <LevelBar stock={m.stock} min={m.minStock} />
              </td>
              <td className="is-num">
                <strong>{amountText(m, m.stock)}</strong>
              </td>
              <td className="is-num">{m.minStock > 0 ? amountText(m, m.minStock) : "—"}</td>
              <td className="is-num">{m.unitCost > 0 ? costText(m) : "—"}</td>
              <td className="is-num">{m.unitCost > 0 ? formatPrice(Math.round(m.stock * m.unitCost)) : "—"}</td>
              <td>
                <div className="a-table__actions">
                  <MaterialActions m={m} onMode={onMode} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MaterialsManager({ materials }: { materials: MaterialWithUse[] }) {
  const [mode, setMode] = useState<Mode>(null);
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [view, setView] = useState<View>("tarjetas");

  // Recuerda la vista elegida en este equipo.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "tabla" || saved === "tarjetas") setView(saved);
    } catch {}
  }, []);

  function changeView(v: View) {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  }

  const low = materials.filter((m) => materialLevel(m) !== "ok");
  const value = materials.reduce((s, m) => s + m.stock * m.unitCost, 0);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return materials.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q)) return false;
      if (filter === "todos") return true;
      if (filter === "poco") return materialLevel(m) !== "ok";
      return m.kind === filter;
    });
  }, [materials, filter, query]);

  function done(msg: string) {
    setMode(null);
    setMessage(msg);
  }

  const title =
    mode?.kind === "buy"
      ? `Compré más: ${mode.material.name}`
      : mode?.kind === "count"
        ? `Contar: ${mode.material.name}`
        : mode?.kind === "edit"
          ? "Editar material"
          : "Nuevo material";

  return (
    <>
      <Notice message={message} />

      <section className="a-stats a-stats--3">
        <div className="a-stat">
          <span className="a-stat__label">Materiales</span>
          <span className="a-stat__value">{materials.length}</span>
        </div>
        <button type="button" className={`a-stat${low.length ? " a-stat--warn" : ""}`} onClick={() => setFilter("poco")}>
          <span className="a-stat__label">Queda poco</span>
          <span className="a-stat__value">{low.length}</span>
        </button>
        <div className="a-stat">
          <span className="a-stat__label">Valor de lo que tienes</span>
          <span className="a-stat__value">{formatPrice(Math.round(value))}</span>
        </div>
      </section>

      <div className="a-toolbar">
        <div className="a-toolbar__top">
          <div className="a-search">
            <SearchIcon size={18} />
            <input type="search" className="a-input" placeholder="Buscar material…" aria-label="Buscar material" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="a-viewswitch" role="radiogroup" aria-label="Cómo ver los materiales">
            <button type="button" role="radio" aria-checked={view === "tarjetas"} onClick={() => changeView("tarjetas")}>
              <GridIcon size={18} /> Tarjetas
            </button>
            <button type="button" role="radio" aria-checked={view === "tabla"} onClick={() => changeView("tabla")}>
              <TableIcon size={18} /> Tabla
            </button>
          </div>
        </div>
        <div className="a-tabs" role="tablist" aria-label="Filtrar materiales">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className="a-tabs__tab" onClick={() => setFilter(f.id)}>
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="a-empty">{materials.length ? "No hay materiales en esta lista." : "Anota tu primer material: cuero, hilo, hebillas…"}</p>
      ) : view === "tabla" ? (
        <MaterialsTable list={visible} onMode={setMode} />
      ) : (
        <ul className="a-materials">
          {visible.map((m) => (
            <li key={m.id} id={`m-${m.id}`} className={`a-material a-material--${materialLevel(m)}`}>
              <div className="a-material__head">
                <div>
                  <strong>{m.name}</strong>
                  <span className="a-muted a-small">
                    {MATERIAL_KINDS.find((k) => k.id === m.kind)?.name}
                    {m.supplier && ` · ${m.supplier}`}
                    {m.unitCost > 0 && ` · ${costText(m)}`}
                  </span>
                </div>
                <span className="a-material__amount">{formatAmount(m.stock, m.unit)}</span>
              </div>
              <LevelBar stock={m.stock} min={m.minStock} />
              {unitsPerYard(m.kind, m.unit) && m.stock > 0 && (
                <span className="a-muted a-small">Equivale a {formatQuantity(m.stock / unitsPerYard(m.kind, m.unit)!)} yardas</span>
              )}
              {m.minStock > 0 && <span className="a-muted a-small">Te avisamos si baja de {amountText(m, m.minStock)}</span>}
              <div className="a-material__actions">
                <MaterialActions m={m} onMode={setMode} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="a-add" onClick={() => setMode({ kind: "new" })}>
        <PlusIcon /> Agregar un material nuevo
      </button>

      <Sheet open={mode !== null} onClose={() => setMode(null)} title={title}>
        {mode?.kind === "buy" && <BuyForm m={mode.material} onDone={done} />}
        {mode?.kind === "count" && <CountForm m={mode.material} onDone={done} />}
        {mode?.kind === "edit" && <EditForm m={mode.material} onDone={done} />}
        {mode?.kind === "new" && <EditForm m={null} onDone={done} />}
      </Sheet>
    </>
  );
}
