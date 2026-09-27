import type { CSSProperties } from "react";

// ============================================================================
//  ANIMALES DE FONDO DEL INICIO — para moverlos, edita solo la lista ANIMALS.
// ============================================================================
//
//  Cada animal va en una sección de la página:
//    "hero"     → bloque de arriba (título y botones)
//    "piezas"   → "Piezas del taller"
//    "valores"  → franja "Cortado y cosido a mano…"
//    "encargos" → bloque oscuro "¿Buscas algo que no está en el catálogo?"
//    "taller"   → "El taller", al final
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
type Section = "hero" | "piezas" | "valores" | "encargos" | "taller";

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
  { animal: "chinchilla", section: "hero", desktop: { top: "30px", left: "44%", width: "118px" }, mobile: { top: "20px", left: "16px", width: "72px" } },
  { animal: "chincol", section: "hero", desktop: { bottom: "-18px", right: "-34px", width: "250px" }, mobile: { top: "14px", right: "8px", width: "112px" } },
  { animal: "zorro", section: "piezas", desktop: { top: "36px", left: "38%", width: "150px", flip: true }, mobile: { top: "18px", right: "12px", width: "92px", flip: true } },
  { animal: "fiu", section: "encargos", desktop: { bottom: "-24px", right: "-10px", width: "220px" }, mobile: { bottom: "-16px", right: "-12px", width: "140px" } },
  { animal: "pudu", section: "taller", desktop: { top: "40px", right: "10%", width: "170px" }, mobile: { top: "24px", right: "12px", width: "96px" } },
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
      {here.map((a) => {
        const mobile = a.mobile === undefined ? a.desktop : a.mobile;
        return (
          <span
            key={a.animal}
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
