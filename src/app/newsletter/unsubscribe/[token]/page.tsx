import { unsubscribeAction } from "./actions";

export const metadata = { title: "Cancelar suscripción · Chincol", robots: { index: false } };

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <main style={{ maxWidth: 620, margin: "80px auto", padding: 24, textAlign: "center" }}>
    <h1>Cancelar suscripción</h1>
    <p>Confirma si ya no quieres recibir novedades de Chincol Artesanía.</p>
    <form action={unsubscribeAction.bind(null, token)}><button className="btn" type="submit">Darme de baja</button></form>
  </main>;
}
