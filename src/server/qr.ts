import "server-only";
import { headers } from "next/headers";
import QRCode from "qrcode";

/** Dirección pública del sitio: SITE_URL si está definida, o la del navegador que pide la página. */
export async function siteUrl(): Promise<string> {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** QR en SVG (se ve nítido impreso en cualquier tamaño). */
export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#2b2019", light: "#ffffff" } });
}
