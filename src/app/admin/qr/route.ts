import { qrSvg, siteUrl } from "@/server/qr";
import { cleanSource } from "@/server/services/customer-service";

/** QR del formulario en grande, para imprimir. Protegido por el middleware de /admin. */
export async function GET(req: Request) {
  const source = cleanSource(new URL(req.url).searchParams.get("origen"));
  const svg = await qrSvg(`${await siteUrl()}/formulario${source ? `?origen=${encodeURIComponent(source)}` : ""}`);
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "no-store" } });
}
