import type { CSSProperties } from "react";

// ============================================================================
//  ANIMALES DE FONDO DEL INICIO — para moverlos, edita solo la lista ANIMALS.
// ============================================================================
//
//  Cada animal va en una sección ("section") de una página:
//
//    Inicio (/):
//    "hero"            → bloque de arriba (título y botones)
//    "piezas"          → "Piezas del taller"
//    "valores"         → franja "Cortado y cosido a mano…"
//    "encargos"        → bloque oscuro "¿Buscas algo que no está en el catálogo?"
//    "taller"          → "El taller"
//    "contacto-inicio" → pie de página (Tienda, Contacto, newsletter), SOLO en el inicio
//
//    Otras páginas:
//    "catalogo"        → Catálogo (/catalogo)
//    "personalizados"  → Catálogo filtrado en "Personalizados" (/catalogo?tipo=personalizable)
//    "producto"        → Ficha de un producto (/catalogo/…), sin la franja "También del taller"
//    "carrito"         → Carrito (/carrito)
//    "contacto"        → pie de página en TODAS las páginas menos el inicio
//
//  La posición se mide desde los bordes de esa sección:
//    top / bottom / left / right → en px ("24px") o % ("40%"); usa solo los que necesites.
//    width → tamaño del animal (el alto se calcula solo).
//    flip  → true para que mire hacia el otro lado.
//    color → opcional, para cambiar el tono de ese animal.
//
//  "mobile" es la posición en celular. Si no lo pones, usa la misma de computador;
//  si pones mobile: null, ese animal no aparece en celular.
//
//  Los dibujos están en public/ilustraciones/<animal>.svg.

type Animal = "chincol" | "zorro" | "pudu" | "chinchilla" | "fiu";
export type Section =
  | "hero"
  | "piezas"
  | "valores"
  | "encargos"
  | "taller"
  | "contacto-inicio"
  | "catalogo"
  | "personalizados"
  | "producto"
  | "carrito"
  | "contacto";

interface Spot {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  width: string;
  flip?: boolean;
}

interface Placement {
  animal: Animal;
  section: Section;
  desktop: Spot;
  mobile?: Spot | null;
  color?: string;
}

const ANIMALS: Placement[] = [
  // ----- Inicio -----
  { animal: "chincol", section: "hero", desktop: { bottom: "7px", right: "12px", width: "380px" }, mobile: { top: "14px", right: "8px", width: "112px" } },
  { animal: "zorro", section: "piezas", desktop: { top: "50px", left: "2%", width: "550px", flip: false }, mobile: { top: "18px", right: "12px", width: "92px", flip: true } },
  { animal: "fiu", section: "encargos", desktop: { bottom: "60px", right: "10%", width: "320px" }, mobile: { bottom: "-16px", right: "-12px", width: "140px" }, color: "#d6a77a" },
  { animal: "pudu", section: "taller", desktop: { top: "30px", right: "77%", width: "200px" }, mobile: { top: "24px", right: "12px", width: "96px" }, color:"#3f2a1d" },
  { animal: "chinchilla", section: "contacto-inicio", desktop: { bottom: "16px", right: "46%", width: "250px" }, mobile: { bottom: "12px", right: "12px", width: "110px" }, color:"#f3e4d6" },
  
  // ----- Otras páginas -----
  { animal: "chinchilla", section: "catalogo", desktop: { bottom: "24px", left: "2%", width: "430px", flip: true }, mobile: { top: "14px", right: "12px", width: "90px" }, color:"#8a4b2a" },
  //{ animal: "chincol", section: "catalogo", desktop: { bottom: "24px", left: "2%", width: "430px", flip: true }, mobile: { bottom: "16px", left: "12px", width: "110px" }, color:"#8a4b2a" },
  { animal: "pudu", section: "personalizados", desktop: { top: "218px", right: "6%", width: "390px" }, mobile: { top: "14px", right: "12px", width: "80px" }, color:"#8a4b2a" },
  { animal: "zorro", section: "producto", desktop: { bottom: "12px", left: "4%", width: "360px", flip: false }, mobile: { bottom: "12px", left: "12px", width: "120px", flip: true }, color:"#8a4b2a" },
  { animal: "fiu", section: "carrito", desktop: { bottom: "24px", left: "4%", width: "430px", flip: false}, mobile: { top: "16px", right: "12px", width: "90px" }, color:"#8a4b2a" },
  { animal: "chincol", section: "contacto", desktop: { bottom: "40px", right: "3%", width: "290px" }, mobile: { bottom: "12px", right: "12px", width: "100px" },color:"#f3e4d6" },
];

// Proporción ancho / alto de cada dibujo, para que no se deformen.
const ASPECT: Record<Animal, string> = {
  chincol: "1532 / 1363",
  zorro: "1430 / 1174",
  pudu: "1494 / 1469",
  chinchilla: "1263 / 814",
  fiu: "1149 / 921",
};

function vars(spot: Spot, prefix: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ["top", "right", "bottom", "left", "width"] as const) if (spot[key]) out[`--${prefix}${key}`] = spot[key]!;
  if (spot.flip) out[`--${prefix}flip`] = "-1";
  return out;
}

/** Capa decorativa de una sección: va detrás del contenido y no bloquea clics. */
export function PageAnimals({ section, full = false }: { section: Section; full?: boolean }) {
  const here = ANIMALS.filter((a) => a.section === section);
  if (here.length === 0) return null;
  return (
    <div className={`page-animals${full ? " page-animals--full" : ""}`} aria-hidden>
      {here.map((a, i) => {
        const mobile = a.mobile === undefined ? a.desktop : a.mobile;
        return (
          <span
            key={`${a.animal}-${i}`}
            className={`page-animal${mobile === null ? " page-animal--desktop-only" : ""}`}
            style={
              {
                "--shape": `url(/ilustraciones/${a.animal}.svg)`,
                aspectRatio: ASPECT[a.animal],
                ...(a.color ? { color: a.color } : {}),
                ...vars(a.desktop, ""),
                ...(mobile ? vars(mobile, "m-") : {}),
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
