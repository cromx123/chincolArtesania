"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { type CatalogFilters, filtersToQuery } from "@/domain/catalog-filters";

/** Cambia los filtros actualizando la URL; la página se vuelve a renderizar en el servidor. */
export function useCatalogNavigation(current: CatalogFilters) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function update(patch: Partial<CatalogFilters>) {
    const next = { ...current, ...patch };
    startTransition(() => router.push(`/catalogo${filtersToQuery(next)}`, { scroll: false }));
  }

  function toggle<K extends "categories" | "kinds" | "availability">(key: K, value: CatalogFilters[K][number]) {
    const list = current[key] as string[];
    update({ [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] } as Partial<CatalogFilters>);
  }

  return { update, toggle, pending };
}
