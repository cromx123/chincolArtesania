"use client";

import { usePathname } from "next/navigation";
import { PageAnimals } from "../PageAnimals";

/** El pie de página es el mismo en toda la tienda: en el inicio usa "contacto-inicio" y en el resto "contacto". */
export function FooterAnimals() {
  return <PageAnimals section={usePathname() === "/" ? "contacto-inicio" : "contacto"} />;
}
