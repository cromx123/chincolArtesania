// Tipos compartidos entre las herramientas del bot de clientes (catálogo + cotizaciones).

/** Datos de la conversación que las herramientas que escriben (cotizaciones) necesitan. */
export interface BotToolContext {
  channel: string;
  conversationId: string | null;
}
