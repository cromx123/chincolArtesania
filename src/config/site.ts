// Datos de contacto de la pyme. Se completan en `.env.local` (ver `.env.example`).
// Lo que quede vacío simplemente no se muestra.

function env(value: string | undefined): string | null {
  return value && value.trim() ? value.trim() : null;
}

export const site = {
  name: "Chincol",
  fullName: "Chincol Artesanía",
  tagline: "Marroquinería hecha a mano. Piezas propias y encargos personalizados.",
  whatsapp: env(process.env.NEXT_PUBLIC_WHATSAPP),
  instagram: env(process.env.NEXT_PUBLIC_INSTAGRAM),
  email: env(process.env.NEXT_PUBLIC_EMAIL),
  address: env(process.env.NEXT_PUBLIC_ADDRESS),
  hours: env(process.env.NEXT_PUBLIC_HOURS),
};

/** Link a WhatsApp con el mensaje escrito. Sin número, WhatsApp pide elegir el contacto. */
export function whatsappLink(message: string): string {
  const base = site.whatsapp ? `https://wa.me/${site.whatsapp}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function instagramUrl(): string | null {
  return site.instagram ? `https://instagram.com/${site.instagram.replace(/^@/, "")}` : null;
}
