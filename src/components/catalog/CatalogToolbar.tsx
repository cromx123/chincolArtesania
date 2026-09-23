"use client";

import { useEffect, useState } from "react";
import { AVAILABILITY_FILTERS, type CatalogFilters, KINDS, SORTS, type Sort } from "@/domain/catalog-filters";
import { CATEGORIES } from "@/domain/product";
import { CloseIcon, SearchIcon } from "../icons";
import { useCatalogNavigation } from "./use-catalog-navigation";

export function CatalogToolbar({ filters }: { filters: CatalogFilters }) {
  const { update, toggle, pending } = useCatalogNavigation(filters);
  const [q, setQ] = useState(filters.q);

  useEffect(() => setQ(filters.q), [filters.q]);

  const chips = [
    ...filters.kinds.map((id) => ({ label: KINDS.find((k) => k.id === id)!.name, remove: () => toggle("kinds", id) })),
    ...filters.categories.map((id) => ({ label: CATEGORIES.find((c) => c.id === id)!.name, remove: () => toggle("categories", id) })),
    ...filters.availability.map((id) => ({ label: AVAILABILITY_FILTERS.find((a) => a.id === id)!.name, remove: () => toggle("availability", id) })),
  ];

  return (
    <div className="toolbar" aria-busy={pending}>
      <form
        className="search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: q.trim() });
        }}
      >
        <label htmlFor="buscar" className="sr-only">
          Buscar piezas
        </label>
        <input id="buscar" type="search" placeholder="Buscar pieza…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit" className="search__submit" aria-label="Buscar">
          <SearchIcon size={18} />
        </button>
      </form>

      <div className="toolbar__row">
        <div className="chips">
          {chips.length > 0 && <span className="muted chips__label">Filtros activos:</span>}
          {chips.map((c) => (
            <button key={c.label} type="button" className="chip" onClick={c.remove} aria-label={`Quitar filtro ${c.label}`}>
              {c.label}
              <CloseIcon size={12} />
            </button>
          ))}
        </div>
        <div className="sort">
          <label htmlFor="orden">Ordenar</label>
          <select id="orden" value={filters.sort} onChange={(e) => update({ sort: e.target.value as Sort })}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
