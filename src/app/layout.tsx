import type { Metadata, Viewport } from "next";
import { Fraunces, Karla } from "next/font/google";
import { site } from "@/config/site";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-display" });
const karla = Karla({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });

export const metadata: Metadata = {
  title: { default: `${site.fullName} · Marroquinería hecha a mano`, template: `%s · ${site.fullName}` },
  description: site.tagline,
};

export const viewport: Viewport = {
  themeColor: "#F7F2EA",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" className={`${fraunces.variable} ${karla.variable}`}>
      <body>{children}</body>
    </html>
  );
}
