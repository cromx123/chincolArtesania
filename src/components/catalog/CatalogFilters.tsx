"use client";

import { useState } from "react";
import { AVAILABILITY_FILTERS, type CatalogFilters as Filters, EMPTY_FILTERS, KINDS, hasActiveFilters } from "@/domain/catalog-filters";
import type { CategoryCount } from "@/server/services/catalog-service";
import { CloseIcon, FilterIcon } from "../icons";
import { useCatalogNavigation } from "./use-catalog-navigation";

type Props = { filters: Filters; categories: CategoryCount[]; total: number };

/** Panel lateral en escritorio; en celular se abre con el botón "Filtros". */
export function CatalogFilters({ filters, categories, total }: Props) {
  const [open, setOpen] = useState(false);
  const { toggle, update } = useCatalogNavigation(filters);
  const activeCount = filters.categories.length + filters.kinds.length + filters.availability.length;

  return (
    <>
      <button type="button" className="filters-toggle" aria-expanded={open} aria-controls="catalog-filters" onClick={() => setOpen(true)}>
        <FilterIcon size={18} />
        Filtros{activeCount > 0 && <span className="count-dot count-dot--inline">{activeCount}</span>}
      </button>

      <aside id="catalog-filters" className={`filters${open ? " is-open" : ""}`} aria-label="Filtros">
        <div className="filters__head">
          <h2>Filtros</h2>
          <button type="button" className="icon-button icon-button--bare" aria-label="Cerrar filtros" onClick={() => setOpen(false)}>
            <CloseIcon />
          </button>
        </div>

        <fieldset className="filters__group">
          <legend className="eyebrow">Tipo de pieza</legend>
          {KINDS.map((k) => (
            <label key={k.id} className="check">
              <input type="checkbox" checked={filters.kinds.includes(k.id)} onChange={() => toggle("kinds", k.id)} />
              {k.name}
            </label>
          ))}
        </fieldset>

        <fieldset className="filters__group">
          <legend className="eyebrow">Categoría</legend>
          {categories.map((c) => (
            <label key={c.id} className="check">
              <input type="checkbox" checked={filters.categories.includes(c.id)} onChange={() => toggle("categories", c.id)} />
              {c.name} <span className="muted">({c.count})</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="filters__group">
          <legend className="eyebrow">Disponibilidad</legend>
          {AVAILABILITY_FILTERS.map((a) => (
            <label key={a.id} className="check">
              <input type="checkbox" checked={filters.availability.includes(a.id)} onChange={() => toggle("availability", a.id)} />
              {a.name}
            </label>
          ))}
        </fieldset>

        <div className="filters__actions">
          <button
            type="button"
            className="btn btn--ghost"
            disabled={!hasActiveFilters(filters)}
            onClick={() => update({ ...EMPTY_FILTERS, sort: filters.sort })}
          >
            Limpiar filtros
          </button>
          <button type="button" className="btn btn--primary filters__apply" onClick={() => setOpen(false)}>
            Ver {total} {total === 1 ? "pieza" : "piezas"}
          </button>
        </div>
      </aside>
      {open && <div className="filters-backdrop" onClick={() => setOpen(false)} aria-hidden />}
    </>
  );
}
