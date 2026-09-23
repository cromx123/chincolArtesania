import type { Metadata } from "next";
import { formatAmount, isMaterialUnit } from "@/domain/material";
import { dayLabel } from "@/lib/dates";
import { materialService } from "@/server/services/material-service";
import { MaterialsManager } from "@/components/admin/MaterialsManager";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata: Metadata = { title: "Materiales" };

const REASON: Record<string, string> = {
  compra: "Compra",
  fabricacion: "Hiciste piezas",
  venta: "Venta a pedido",
  ajuste: "Conteo",
};

export default async function MaterialsPage() {
  const [materials, movements] = await Promise.all([materialService.list(), materialService.recentMovements(8)]);

  return (
    <div className="a-page">
      <PageHeader title="Materiales" subtitle="Cueros, hilos, herrajes y acabados del taller" />
      <MaterialsManager materials={materials} />

      {movements.length > 0 && (
        <section className="a-card">
          <h2 className="a-card__title">Últimos movimientos</h2>
          <ul className="a-moves">
            {movements.map((m) => (
              <li key={m.id}>
                <span className={`a-moves__delta ${m.delta > 0 ? "is-in" : "is-out"}`}>
                  {m.delta > 0 ? "+" : "−"}
                  {formatAmount(Math.abs(m.delta), isMaterialUnit(m.unit) ? m.unit : "u")}
                </span>
                <span className="a-moves__text">
                  <strong>{m.materialName}</strong>
                  <span className="a-muted a-small">
                    {REASON[m.reason] ?? m.reason}
                    {m.note && ` · ${m.note}`} · {dayLabel(m.createdAt).toLowerCase()}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
