import "server-only";
import { MAX_VARIATION_SURCHARGE } from "@/domain/pricing";
import { formatPrice } from "@/lib/format";
import { quoteService } from "../services/quote-service";
import type { BotToolContext } from "./types";

// Cotizaciones del bot de clientes. El precio se calcula una sola vez, en cotizar_pedido,
// y queda guardado con un id: guardar_solicitud_cotizacion solo le agrega el contacto.
// Así lo que se le dice al cliente es exactamente lo que le llega a la dueña.

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export const quoteTools = [
  {
    name: "cotizar_pedido",
    description:
      "Cotiza una pieza del catálogo para encargarla, esté o no en stock (las agotadas siguen en el catálogo y se pueden encargar). Dos tipos:\n" +
      "- tal_cual: la pieza como está en su ficha, por ejemplo porque está agotada y la quiere igual. Elegir entre las opciones que la ficha ofrece (color de cuero, color de hilo, grabado de iniciales) sigue siendo tal_cual. Precio = el de la tienda.\n" +
      "- variacion: pide algo que la ficha no ofrece (otro tamaño, más bolsillos, otra forma, otro material). Precio = precio normal + material y trabajo extra, con tope de 30% más.\n" +
      "Devuelve precio_clp y cotizacion_id. Dile al cliente EXACTAMENTE precio_clp (sin redondear ni recalcular).",
    input_schema: {
      type: "object",
      properties: {
        producto_id: { type: "string", description: "id de la pieza, obtenido con buscar_productos o ver_producto" },
        tipo: { type: "string", enum: ["tal_cual", "variacion"] },
        cambios: {
          type: "string",
          description: "tal_cual: opciones elegidas (ej: 'cuero caramelo, hilo natural') o 'como en la ficha'. variacion: qué pide distinto a la pieza original.",
        },
        mas_material_pct: {
          type: "number",
          description: "Solo variacion: cuánto más material usa, en %. Ej: un bolsillo extra 10–20, 'más grande' 25–40, 'el doble de tamaño' 100.",
        },
        mas_horas_pct: { type: "number", description: "Solo variacion: cuánto más trabajo toma, en %. Si no lo sabes, omítelo (se usa el mismo % del material)." },
      },
      required: ["producto_id", "tipo", "cambios"],
    },
    async run(input: Record<string, unknown>, ctx: BotToolContext) {
      const productId = str(input.producto_id);
      const changes = str(input.cambios);
      if (!productId) return { error: "Falta el id de la pieza. Búscala primero con buscar_productos." };
      const origin = { conversationId: ctx.conversationId, channel: ctx.channel };

      if (input.tipo === "tal_cual") {
        const r = await quoteService.draftAsIs(origin, productId, changes || "La pieza tal cual está en el catálogo.");
        if (!r.ok) return { error: r.error };
        ctx.quotedPrices.push({ price: r.price, estimate: false });
        return {
          cotizacion_id: r.id,
          tipo: "tal_cual",
          pieza: r.productName,
          precio_clp: r.price,
          precio_texto: formatPrice(r.price),
          instrucciones: `Dile al cliente que ${r.productName} se le hace por encargo en ${formatPrice(r.price)}, el precio de la tienda; la artesana le confirma el plazo. Para dejarlo pedido, pídele nombre y teléfono o correo y llama guardar_solicitud_cotizacion con este cotizacion_id.`,
        };
      }

      if (input.tipo !== "variacion") return { error: "tipo debe ser 'tal_cual' o 'variacion'." };
      if (!changes) return { error: "Describe qué cambia respecto de la pieza original." };
      const extraMaterial = num(input.mas_material_pct, NaN);
      if (!Number.isFinite(extraMaterial)) return { error: "Falta mas_material_pct: estima cuánto más material usa la variación." };
      const extraHours = num(input.mas_horas_pct, extraMaterial);

      const r = await quoteService.draftVariation(origin, productId, changes, extraMaterial, extraHours);
      if (!r.ok) return { error: r.error };
      ctx.quotedPrices.push({ price: r.price, estimate: true });
      const d = r.detail.tipo === "variacion" ? r.detail : null;
      return {
        cotizacion_id: r.id,
        tipo: "variacion",
        pieza: r.productName,
        cambios: changes,
        precio_normal_clp: d?.basePrice,
        precio_clp: r.price,
        precio_texto: formatPrice(r.price),
        ...(d?.capped
          ? { nota_interna: `El recargo llegó al tope interno (${MAX_VARIATION_SURCHARGE * 100}% sobre la pieza normal). No se lo menciones al cliente.` }
          : {}),
        instrucciones: `Dile al cliente que el precio estimado es ${formatPrice(r.price)} (la pieza normal cuesta ${formatPrice(d?.basePrice ?? r.price)}), y que la artesana lo confirma antes de fabricar. Para dejarlo pedido, pídele nombre y teléfono o correo y llama guardar_solicitud_cotizacion con este cotizacion_id. Si cambia lo que pide, vuelve a cotizar.`,
      };
    },
  },
  {
    name: "guardar_solicitud_cotizacion",
    description:
      "Deja pedida una cotización ya hecha con cotizar_pedido para que la artesana la revise y contacte al cliente. No recalcula nada: guarda el mismo precio que ya le diste. Necesita al menos un teléfono o correo.",
    input_schema: {
      type: "object",
      properties: {
        cotizacion_id: { type: "string", description: "el cotizacion_id que devolvió cotizar_pedido para lo que el cliente quiere" },
        nombre_contacto: { type: "string" },
        telefono_contacto: { type: "string" },
        email_contacto: { type: "string" },
        nota: { type: "string", description: "cualquier detalle extra que valga la pena que ella vea" },
      },
      required: ["cotizacion_id"],
    },
    async run(input: Record<string, unknown>, ctx: BotToolContext) {
      const id = str(input.cotizacion_id);
      if (!id) return { error: "Falta el cotizacion_id: primero cotiza con cotizar_pedido." };
      const contactPhone = str(input.telefono_contacto) || undefined;
      const contactEmail = str(input.email_contacto) || undefined;
      if (!contactPhone && !contactEmail) return { error: "Pídele al cliente un teléfono o correo antes de guardar." };

      const r = await quoteService.confirm(id, { conversationId: ctx.conversationId, channel: ctx.channel }, {
        contactName: str(input.nombre_contacto) || undefined,
        contactPhone,
        contactEmail,
        note: str(input.nota) || undefined,
      });
      if (!r.ok) return { error: r.error };
      return {
        ok: true,
        pieza: r.productName,
        precio_clp: r.price,
        mensaje: r.alreadySaved
          ? "Ya estaba guardada: la artesana ya la tiene."
          : `Listo: la artesana recibió el pedido con ${formatPrice(r.price)} y contactará al cliente para confirmar precio y plazo.`,
      };
    },
  },
] as const;
