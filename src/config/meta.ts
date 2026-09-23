import "server-only";

// Conexión con Meta (WhatsApp Business e Instagram) para el futuro bot de clientes.
// Las credenciales van en variables de entorno (.env.local), nunca en la base de datos.

function env(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

export const META_WEBHOOK_PATH = "/api/meta/webhook";

export const metaConfig = {
  /** Texto que se inventa quien instala y se repite en el panel de Meta al registrar el webhook. */
  verifyToken: env("META_VERIFY_TOKEN"),
  /** "App secret" de la app de Meta: sirve para comprobar que los mensajes vienen de Meta. */
  appSecret: env("META_APP_SECRET"),
  /** Token de acceso para enviar respuestas. */
  accessToken: env("META_ACCESS_TOKEN"),
  whatsappPhoneNumberId: env("META_WHATSAPP_PHONE_NUMBER_ID"),
  instagramAccountId: env("META_INSTAGRAM_ACCOUNT_ID"),
};

export type ChannelStatus = "conectado" | "incompleto" | "sin-conectar";

/** Estado de cada canal según qué variables están completas. */
export function metaStatus(): { webhook: boolean; whatsapp: ChannelStatus; instagram: ChannelStatus } {
  const base = Boolean(metaConfig.verifyToken && metaConfig.appSecret);
  const channel = (id: string | null): ChannelStatus => {
    if (!id) return "sin-conectar";
    return base && metaConfig.accessToken ? "conectado" : "incompleto";
  };
  return { webhook: base, whatsapp: channel(metaConfig.whatsappPhoneNumberId), instagram: channel(metaConfig.instagramAccountId) };
}
