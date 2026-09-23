import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { type AssistantTask, DRAFT_KINDS, type Draft, type DraftKind, type Requirement } from "@/domain/assistant";
import { LEATHER_COLORS, THREAD_COLORS, availabilityLabel, categoryName } from "@/domain/product";
import { MATERIAL_KINDS, formatAmount } from "@/domain/material";
import { recipeCost, unitsPossible } from "@/domain/production";
import { channelName } from "@/domain/sale";
import { materialService } from "../services/material-service";
import { type AdminProduct, productAdminService } from "../services/product-admin-service";
import { saleService } from "../services/sale-service";

// Herramientas de Asistencia. Todas leen los datos reales del administrador,
// así la IA no inventa stock, precios ni materiales. Las únicas que "escriben"
// son mostrar_borrador (solo lo muestra en pantalla) y actualizar_requisitos
// (el panel de la postulación a una feria).

type Tool = Anthropic.Beta.BetaTool;

const buscarProductos: Tool = {
  name: "buscar_productos",
  description:
    "Lista las piezas del taller con precio, stock y disponibilidad. Úsala para encontrar la pieza de la que habla la dueña (por nombre aproximado) o para ver el catálogo completo.",
  input_schema: {
    type: "object",
    properties: { texto: { type: "string", description: "Parte del nombre, ej: 'andes' o 'billetera'. Vacío = todas." } },
  },
};

const verProducto: Tool = {
  name: "ver_producto",
  description:
    "Detalle de una pieza: descripción, opciones que elige el cliente (cuero, hilo, grabado), materiales que usa cada unidad, costo de materiales, stock y cuántas se pueden hacer con los materiales actuales.",
  input_schema: {
    type: "object",
    properties: { id: { type: "string", description: "id del producto, obtenido con buscar_productos" } },
    required: ["id"],
  },
};

const resumenDelTaller: Tool = {
  name: "resumen_del_taller",
  description:
    "Resumen del negocio: cantidad de piezas publicadas, rango de precios, categorías, materiales que trabaja, fotos cargadas y ventas de los últimos 90 días (piezas más vendidas y canales). Útil para postulaciones y para hablar del taller en general.",
  input_schema: { type: "object", properties: {} },
};

const mostrarBorrador: Tool = {
  name: "mostrar_borrador",
  description:
    "Muestra un texto terminado como tarjeta, con botón para copiarlo. Úsala SIEMPRE para entregar el texto final (publicación, respuesta, descripción o texto de postulación), una llamada por texto. No repitas el texto en tu mensaje.",
  input_schema: {
    type: "object",
    properties: {
      titulo: { type: "string", description: "Título corto de la tarjeta, ej: 'Publicación del Bolso Andes'" },
      tipo: { type: "string", enum: Object.keys(DRAFT_KINDS) },
      texto: { type: "string", description: "El texto listo para copiar y pegar, sin hashtags" },
      hashtags: { type: "array", items: { type: "string" }, description: "Solo para Instagram, sin el #" },
      producto_id: { type: "string", description: "Si es la descripción de un producto, su id (permite guardarla en la ficha)" },
    },
    required: ["titulo", "tipo", "texto"],
  },
};

const verRequisitos: Tool = {
  name: "ver_requisitos",
  description: "Muestra el panel de requisitos de esta postulación tal como está ahora (la dueña puede haberlo editado a mano).",
  input_schema: { type: "object", properties: {} },
};

const actualizarRequisitos: Tool = {
  name: "actualizar_requisitos",
  description:
    "Reemplaza el panel de requisitos de la postulación. Llama antes a ver_requisitos para no borrar lo que ella editó. Marca 'listo' solo lo que de verdad se resuelve con los datos del sistema o con un borrador ya entregado.",
  input_schema: {
    type: "object",
    properties: {
      feria: { type: "string", description: "Nombre de la feria, si aparece en las bases" },
      cierre: { type: "string", description: "Fecha de cierre de postulación, tal como aparece, ej: '15 de octubre'" },
      requisitos: {
        type: "array",
        items: {
          type: "object",
          properties: {
            texto: { type: "string", description: "El requisito en palabras simples" },
            estado: { type: "string", enum: ["listo", "falta"] },
            detalle: { type: "string", description: "Cómo se resuelve o qué falta, en pocas palabras" },
          },
          required: ["texto", "estado"],
        },
      },
    },
    required: ["requisitos"],
  },
};

export function toolsFor(task: AssistantTask): Tool[] {
  const base = [buscarProductos, verProducto, resumenDelTaller, mostrarBorrador];
  return task === "feria" ? [...base, verRequisitos, actualizarRequisitos] : base;
}

/** Estado que las herramientas pueden leer y cambiar durante un turno. */
export interface ToolContext {
  requirements: Requirement[] | null;
  fairName: string | null;
  fairDeadline: string | null;
  drafts: Draft[];
}

function productSummary(p: AdminProduct) {
  return {
    id: p.id,
    nombre: p.name,
    categoria: categoryName(p.category),
    precio_clp: p.price,
    disponibilidad: availabilityLabel(p),
    stock_hecho: p.madeToOrder ? null : p.stock,
    a_pedido: p.madeToOrder,
    publicado_en_tienda: p.published,
    fotos: p.images.length,
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

async function run(name: string, input: Record<string, unknown>, ctx: ToolContext): Promise<unknown> {
  switch (name) {
    case "buscar_productos": {
      const q = str(input.texto).toLowerCase();
      const list = await productAdminService.list();
      const matches = list.filter((p) => !q || p.name.toLowerCase().includes(q) || categoryName(p.category).toLowerCase().includes(q));
      return { productos: (matches.length ? matches : list).map(productSummary), coincidencias_exactas: matches.length > 0 };
    }

    case "ver_producto": {
      const p = await productAdminService.get(str(input.id));
      if (!p) return { error: "No existe un producto con ese id. Usa buscar_productos." };
      return {
        ...productSummary(p),
        descripcion: p.description,
        cliente_puede_elegir: {
          colores_de_cuero: LEATHER_COLORS.filter((c) => p.options.leatherColors.includes(c.id)).map((c) => c.name),
          colores_de_hilo: THREAD_COLORS.filter((c) => p.options.threadColors.includes(c.id)).map((c) => c.name),
          grabado_de_iniciales: p.options.engraving,
        },
        materiales_por_unidad: p.recipe.map((l) => `${formatAmount(l.quantity, l.material.unit)} de ${l.material.name}`),
        costo_materiales_por_unidad_clp: p.recipe.length ? recipeCost(p.recipe) : null,
        se_pueden_hacer_con_materiales_actuales: unitsPossible(p.recipe),
        medidas: p.details?.measures ?? null,
        materiales_texto_tienda: p.details?.materials ?? null,
        aviso_stock_bajo_en: p.lowStockAlert,
      };
    }

    case "resumen_del_taller": {
      const [products, materials, sales] = await Promise.all([productAdminService.list(), materialService.list(), saleService.since(90)]);
      const published = products.filter((p) => p.published);
      const prices = published.map((p) => p.price);
      const sold = new Map<string, number>();
      const channels = new Map<string, number>();
      for (const s of sales) {
        channels.set(channelName(s.channel), (channels.get(channelName(s.channel)) ?? 0) + s.total);
        for (const i of s.items) sold.set(i.name, (sold.get(i.name) ?? 0) + i.quantity);
      }
      return {
        piezas_publicadas: published.length,
        piezas_totales: products.length,
        rango_precios_clp: prices.length ? { minimo: Math.min(...prices), maximo: Math.max(...prices) } : null,
        categorias: [...new Set(published.map((p) => categoryName(p.category)))],
        piezas_a_pedido: published.filter((p) => p.madeToOrder).map((p) => p.name),
        personalizables: published.filter((p) => p.customizable).map((p) => p.name),
        fotos_cargadas: products.reduce((n, p) => n + p.images.length, 0),
        materiales_que_trabaja: MATERIAL_KINDS.map((k) => ({
          tipo: k.name,
          materiales: materials.filter((m) => m.kind === k.id).map((m) => m.name),
        })).filter((k) => k.materiales.length),
        ventas_ultimos_90_dias: {
          cantidad_de_ventas: sales.length,
          mas_vendidas: [...sold.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nombre, unidades]) => ({ nombre, unidades })),
          por_canal_clp: Object.fromEntries(channels),
        },
      };
    }

    case "mostrar_borrador": {
      const kind = (str(input.tipo) in DRAFT_KINDS ? str(input.tipo) : "otro") as DraftKind;
      const text = str(input.texto);
      if (!text) return { error: "El texto está vacío." };
      ctx.drafts.push({
        title: str(input.titulo) || DRAFT_KINDS[kind],
        kind,
        text,
        hashtags: Array.isArray(input.hashtags) ? input.hashtags.map(str).filter(Boolean).map((h) => h.replace(/^#/, "")) : [],
        productId: str(input.producto_id) || undefined,
      });
      return { ok: true, mensaje: "Borrador mostrado en pantalla. No lo repitas en tu mensaje." };
    }

    case "ver_requisitos":
      return { feria: ctx.fairName, cierre: ctx.fairDeadline, requisitos: ctx.requirements ?? [] };

    case "actualizar_requisitos": {
      const list = Array.isArray(input.requisitos) ? input.requisitos : [];
      ctx.requirements = list
        .map((r, i): Requirement | null => {
          const item = r as Record<string, unknown>;
          const text = str(item.texto);
          if (!text) return null;
          return { id: `r${Date.now()}-${i}`, text, status: item.estado === "listo" ? "listo" : "falta", note: str(item.detalle) || undefined };
        })
        .filter((r): r is Requirement => r !== null);
      if (str(input.feria)) ctx.fairName = str(input.feria);
      if (str(input.cierre)) ctx.fairDeadline = str(input.cierre);
      return { ok: true, requisitos_en_panel: ctx.requirements.length };
    }

    default:
      return { error: `Herramienta desconocida: ${name}` };
  }
}

/** Ejecuta una herramienta y devuelve el resultado como texto para la API. */
export async function executeTool(name: string, input: unknown, ctx: ToolContext): Promise<{ content: string; isError: boolean }> {
  try {
    const result = await run(name, (input ?? {}) as Record<string, unknown>, ctx);
    const isError = typeof result === "object" && result !== null && "error" in result;
    return { content: JSON.stringify(result), isError };
  } catch (e) {
    return { content: JSON.stringify({ error: e instanceof Error ? e.message : "Error al leer los datos" }), isError: true };
  }
}
