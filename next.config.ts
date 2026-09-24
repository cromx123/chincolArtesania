import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Servidor autocontenido en `.next/standalone` (lo usa el Dockerfile).
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  // Las fotos del celular pueden pesar varios MB; se comprimen al llegar.
  experimental: { serverActions: { bodySizeLimit: "16mb" } },
  // Hay otro package-lock.json en la carpeta del usuario; fijamos la raíz a este proyecto.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
