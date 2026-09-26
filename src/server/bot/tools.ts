import "server-only";
import { catalogTools } from "./catalog-tools";
import { quoteTools } from "./quote-tools";
import type { BotToolContext } from "./types";

// Junta las herramientas de catálogo (solo lectura) y de cotización (Nivel 2)
// en un único set para el bot de clientes, y las ejecuta por nombre.

interface BotTool {
  name: string;
  description: string;
  input_schema: unknown;
  run(input: Record<string, unknown>, ctx: BotToolContext): Promise<unknown>;
}

// catalogTools no necesita el contexto de la conversación; se adapta a la misma firma.
const wrappedCatalogTools: BotTool[] = catalogTools.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.input_schema,
  run: (input: Record<string, unknown>) => t.run(input as never),
}));

export const botTools: BotTool[] = [...wrappedCatalogTools, ...quoteTools];

export function botToolSchemas() {
  return botTools.map(({ name, description, input_schema }) => ({ name, description, input_schema }));
}

/** Ejecuta una herramienta y devuelve el resultado como texto para la API, igual que la asistencia de la dueña. */
export async function executeBotTool(name: string, input: unknown, ctx: BotToolContext): Promise<{ content: string; isError: boolean }> {
  const tool = botTools.find((t) => t.name === name);
  if (!tool) return { content: JSON.stringify({ error: `Herramienta desconocida: ${name}` }), isError: true };
  try {
    const result = await tool.run((input ?? {}) as Record<string, unknown>, ctx);
    const isError = typeof result === "object" && result !== null && "error" in result;
    return { content: JSON.stringify(result), isError };
  } catch (e) {
    return { content: JSON.stringify({ error: e instanceof Error ? e.message : "Error al leer los datos" }), isError: true };
  }
}
