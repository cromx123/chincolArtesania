import type { Metadata } from "next";
import { cleanSource, sourceLabels } from "@/server/services/customer-service";
import { CustomerForm } from "@/components/customer/CustomerForm";

export const metadata: Metadata = {
  title: "Déjanos tus datos",
  description: "Regístrate en Chincol Artesanías: pedidos más rápidos y descuentos para clientas.",
};

export default async function FormPage({ searchParams }: { searchParams: Promise<{ origen?: string }> }) {
  const source = cleanSource((await searchParams).origen);
  const fairName = source?.startsWith("feria:") ? ((await sourceLabels([source])).get(source) ?? null) : null;

  return (
    <div className="container signup-page">
      <p className="eyebrow eyebrow--accent">{fairName ? `¡Gracias por visitarnos en ${fairName}!` : "Chincol Artesanías"}</p>
      <h1>Déjanos tus datos</h1>
      <p className="signup-page__lead">Tus próximos pedidos se completan solos y, a medida que compras, tienes descuentos por ser clienta. Toma menos de un minuto.</p>
      <CustomerForm source={source} fairName={fairName === "Feria eliminada" ? null : fairName} />
    </div>
  );
}
