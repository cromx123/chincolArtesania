import "server-only";
import { quoteService } from "../services/quote-service";
import type { BotToolContext } from "./types";

// Herramientas de cotización del bot de clientes (Nivel 2): calculan un RANGO
// estimado con el costo real del producto base (receta + calculadora de precio)
// y guardan la solicitud para que la artesana confirme el precio final.

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export const quoteTools = [
  {
    name: "cotizar_variacion",
    description:
      "Calcula un RANGO estimado de precio para una variación de una pieza existente (ej: 'como esta billetera pero con más bolsillos'). " +
      "Usa el costo real de materiales y horas del producto base. Preséntalo SIEMPRE como estimado a confirmar por la artesana, nunca como precio final.",
    input_schema: {
      type: "object",
      properties: {
        producto_id: { type: "string", description: "id del producto base, obtenido con buscar_productos o ver_producto" },
        cambios: { type: "string", description: "qué pide el cliente distinto a la pieza original" },
        mas_material_pct: { type: "number", description: "cuánto más material estimas que usará la variación, en %. 0 si es igual." },
        mas_horas_pct: { type: "number", description: "cuánto más tiempo estimas que tomará, en %. 0 si es igual." },
      },
      required: ["producto_id", "cambios"],
    },
    async run(input: Record<string, unknown>) {
      const productId = str(input.producto_id);
      if (!productId) return { error: "Falta el id del producto base. Búscalo primero con buscar_productos." };
      const masMaterial = Math.max(0, num(input.mas_material_pct));
      const masHoras = Math.max(0, num(input.mas_horas_pct));
      const result = await quoteService.estimate(productId, {
        materials: [1, 1 + masMaterial / 100],
        hours: [1, 1 + masHoras / 100],
      });
      if (!result) return { error: "No existe un producto con ese id. Usa buscar_productos." };
      if (!result.range.low.ok || !result.range.high.ok) {
        return { error: result.range.low.problem ?? result.range.high.problem ?? "No se pudo calcular un precio con los valores actuales." };
      }
      return {
        producto_base: result.product.name,
        cambios_pedidos: str(input.cambios),
        rango_estimado_clp: { minimo: result.range.low.price, maximo: result.range.high.price },
        aviso: "Esto es un estimado. La artesana confirma el precio final antes de fabricar.",
      };
    },
  },
  {
    name: "guardar_solicitud_cotizacion",
    description:
      "Guarda la solicitud de cotización para que la artesana la revise y confirme el precio final. Llama SIEMPRE después de mostrarle el rango " +
      "con cotizar_variacion y de tener al menos un teléfono o correo de contacto. Usa los mismos mas_material_pct/mas_horas_pct que usaste en " +
      "cotizar_variacion: el rango se vuelve a calcular aquí con los datos reales, nunca con números inventados.",
    input_schema: {
      type: "object",
      properties: {
        producto_id: { type: "string", description: "id del producto base, el mismo usado en cotizar_variacion" },
        cambios: { type: "string" },
        mas_material_pct: { type: "number" },
        mas_horas_pct: { type: "number" },
        nombre_contacto: { type: "string" },
        telefono_contacto: { type: "string" },
        email_contacto: { type: "string" },
        nota: { type: "string", description: "cualquier detalle extra que valga la pena que ella vea" },
      },
      required: ["producto_id", "cambios"],
    },
    async run(input: Record<string, unknown>, ctx: BotToolContext) {
      const productId = str(input.producto_id);
      const changes = str(input.cambios);
      if (!productId || !changes) return { error: "Falta el producto o la descripción del pedido." };
      const contactPhone = str(input.telefono_contacto) || undefined;
      const contactEmail = str(input.email_contacto) || undefined;
      if (!contactPhone && !contactEmail) {
        return { error: "Pídele al cliente un teléfono o correo antes de guardar la solicitud." };
      }

      const masMaterial = Math.max(0, num(input.mas_material_pct));
      const masHoras = Math.max(0, num(input.mas_horas_pct));
      const result = await quoteService.estimate(productId, {
        materials: [1, 1 + masMaterial / 100],
        hours: [1, 1 + masHoras / 100],
      });
      if (!result) return { error: "No existe un producto con ese id. Usa buscar_productos." };
      if (!result.range.low.ok || !result.range.high.ok) {
        return { error: result.range.low.problem ?? result.range.high.problem ?? "No se pudo calcular un precio con los valores actuales." };
      }

      await quoteService.create({
        conversationId: ctx.conversationId,
        channel: ctx.channel,
        productId,
        changes,
        estimateLow: result.range.low.price,
        estimateHigh: result.range.high.price,
        estimateDetail: result.range,
        contactName: str(input.nombre_contacto) || undefined,
        contactPhone,
        contactEmail,
        note: str(input.nota) || undefined,
      });
      return { ok: true, mensaje: "Listo, la artesana revisará esta cotización y te responderá pronto." };
    },
  },
] as const;
