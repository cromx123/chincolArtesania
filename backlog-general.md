# Backlog general - Chincol Artesanía

> Las fechas salen del historial de git (formato AAAA-MM-DD).
> Los ítems marcados con `(≤ 2026-09-23)` ya venían completados en la primera versión del backlog y no tienen un commit propio que indique cuándo se hicieron.
> Las tareas pendientes se dejan sin marcar; cuando hay avance parcial se indica con una nota.

## 1. Estrategia y preparación
- [x] Identificar público objetivo.
- [x] Analizar competidores y referentes en Instagram. `(≤ 2026-09-23)`
- [x] Definir propuesta de valor y diferenciadores. `(≤ 2026-09-23)`
- [x] Establecer tono, identidad visual y estilo comunicacional. `(≤ 2026-09-23)`
- [x] Ilustraciones de fauna chilena para la marca (chincol, fiu, pudú, chinchilla y zorro). `2026-09-27`

## 2. Rediseño de Instagram
- [ ] Optimizar nombre de usuario y nombre visible.
- [ ] Diseñar o actualizar logo, colores y tipografías.
- [ ] Redactar una biografía clara con propuesta de valor.
- [ ] Incorporar enlace al catálogo web o página de contacto.
- [ ] Diseñar fotos para historias destacadas.
- [ ] Organizar historias destacadas: productos, precios, opiniones, preguntas frecuentes y contacto.
- [ ] Crear plantillas para publicaciones y stories.
- [ ] Preparar fotografías y videos profesionales de los productos.
- [ ] Crear contenido educativo, promocional y testimonial.
  - Avance `2026-09-23`: la sección de asistencia del panel ya redacta publicaciones e historias con los productos reales.
- [ ] Definir frecuencia de publicación.
- [ ] Configurar botones de contacto y WhatsApp.
- [ ] Activar cuenta profesional y revisar estadísticas.
- [ ] Publicar contenido inicial antes de iniciar campañas.

## 3. Bot fidelizador
- [x] Definir el objetivo del bot: atención, ventas, soporte o fidelización. (Atención de catálogo y cotización de encargos) `2026-09-26`
- [x] Seleccionar el canal: Instagram, WhatsApp, sitio web u otro.
  - Webhook de Meta para WhatsApp e Instagram. `2026-09-23`
  - Chat en el sitio web (widget flotante en la tienda). `2026-09-26`
- [x] Diseñar el flujo de conversación. `2026-09-26` (ajustado `2026-09-27`)
- [x] Crear mensaje de bienvenida. `2026-09-26`
- [ ] Configurar menú de opciones.
- [ ] Automatizar respuestas a preguntas frecuentes.
- [x] Integrar catálogo, precios y disponibilidad. `2026-09-26` (ofertas vigentes incluidas `2026-09-27`)
- [ ] Configurar recomendaciones de productos.
- [x] Crear sistema de cupones, puntos o beneficios. (Códigos de promoción y descuentos por fidelidad en el carrito) `2026-09-24`
- [ ] Automatizar seguimiento posterior a la compra.
- [ ] Solicitar reseñas y testimonios.
- [ ] Configurar derivación a un agente humano.
  - Avance `2026-09-26`: las cotizaciones del bot quedan guardadas para que la artesana las revise y confirme.
- [ ] Cumplir normas de privacidad y consentimiento de datos.
  - Avance `2026-09-24`: el formulario de clientas pide consentimiento explícito; desuscripción del newsletter `2026-09-25`.
- [x] Probar el bot con distintos escenarios. `2026-09-27`
- [x] Medir conversiones, conversiones y consultas derivadas.`2026-09-27`
- [x] Cotización automática de encargos (pieza tal cual o variación) con precio calculado por el sistema. `2026-09-26` (reforzada `2026-09-27`)
- [x] Guardar solicitudes de cotización con los datos de contacto del cliente. `2026-09-26`
- [x] Protección del bot contra intentos de cambiarle el rol o sacarle información interna. `2026-09-26`

## 4. Catálogo web
- [x] Elegir dominio y plataforma tecnológica. (Next.js + Prisma + SQLite) `2026-09-23`
- [x] Diseñar la estructura del sitio. `2026-09-23`
- [x] Crear página de inicio. `2026-09-23`
- [x] Crear categorías y filtros de productos. `2026-09-23`
- [x] Cargar fotografías, descripciones y precios. `2026-09-23`
- [x] Incorporar variantes como tallas, colores o formatos. `2026-09-23`
- [x] Agregar información de despacho, cambios y devoluciones. `2026-09-23`
- [x] Configurar formularios o proceso de compra. `2026-09-23`
- [x] Optimizar el sitio para dispositivos móviles. `2026-09-23`
- [x] Configurar SEO básico. `2026-09-23`
- [x] Crear botones de contacto y WhatsApp. `2026-09-23`
- [x] Realizar pruebas de navegación y cotización.`2026-09-27`
- [x] Publicar el catálogo. `2026-09-23`
- [x] Carrito de compras. `2026-09-23`
- [x] Códigos de promoción y descuento de fidelidad aplicados en el carrito. `2026-09-24`
- [x] Formulario de registro de clientas (con selector de comuna). `2026-09-24` (comunas `2026-09-25`)
- [x] Suscripción al newsletter desde el pie de página. `2026-09-24`
- [x] Foto principal en la portada. `2026-09-25`
- [x] Precios de oferta con descuento y fecha de término en catálogo y ficha. `2026-09-27`
- [x] Ilustraciones de animales en la portada y el pie de página. `2026-09-27`
- [x] Solicitar cotización o encargo directamente desde el carrito. `2026-09-27`

## 5. Gestor de inventario
- [x] Elegir un sistema de gestión de inventario. `2026-09-23`
- [x] Crear una base maestra de productos. `2026-09-23`
- [x] Registrar stock inicial. `2026-09-23`
- [x] Configurar precios y costos. `2026-09-23`
- [x] Definir niveles mínimos de inventario. `2026-09-23`
- [x] Configurar alertas de reposición. `2026-09-23`
- [x] Registrar proveedores. `2026-09-23`
- [x] Integrar el inventario con el catálogo web. `2026-09-23`
- [x] Sincronizar ventas y reservas. `2026-09-23`
- [x] Conversor de unidades para hilos (yardas ↔ cm/m). `2026-09-27`

## 6. Administración
- [x] Panel tipo dashboard con métricas clave. `2026-09-23`
- [x] Login y acceso protegido al panel administrativo. `2026-09-23`
- [x] Visualización de ventas, ingresos y estado del mes. `2026-09-23`
- [x] Registro de ventas por canal (Instagram, WhatsApp, feria, taller, etc.). `2026-09-23`
- [x] Gestión de productos: alta, edición, stock y publicación. `2026-09-23`
- [x] Seguimiento de inventario y stock de productos. `2026-09-23`
- [x] Gestión de materiales, compras y niveles mínimos. `2026-09-23`
- [x] Alertas de stock bajo y compras pendientes. `2026-09-23`
- [x] Ajustes de stock y movimientos de inventario. `2026-09-23`
- [x] Calculadora de costos y margen de ganancia. `2026-09-23`
- [x] Vista de ventas pendientes por cobrar. `2026-09-23`
- [x] Sección de asistencia para la pyme (guías, publicaciones, ferias, atención al cliente, descripción de productos). `2026-09-27`
- [x] Tarjeta de configuración del bot de Meta en el panel. `2026-09-23`
- [x] Gestión de clientas con historial de compras. `2026-09-24`
- [x] Reglas de descuento por fidelidad (por piezas compradas o antigüedad). `2026-09-24`
- [x] Gestión de códigos de promoción. `2026-09-24`
- [x] Código QR del formulario de registro para ferias. `2026-09-24`
- [x] Calendario de ferias y eventos. `2026-09-24` (hora de la feria `2026-09-25`, vista mejorada `2026-09-26`)
- [x] Cotizaciones recibidas desde el bot, con estado. `2026-09-26`
- [x] Encargos / pedidos de producción con avance por etapas. `2026-09-26` (integrados en cotizaciones `2026-09-27`)
- [x] Crear cotizaciones manuales desde el panel. `2026-09-27`
- [x] Editar ventas ya registradas. `2026-09-27`

## 7. Lanzamiento y captación
- [ ] Crear una campaña de expectativa en Instagram.
- [ ] Anunciar el nuevo catálogo web.
- [ ] Publicar promociones de lanzamiento.
- [ ] Crear campañas de anuncios segmentadas.
- [ ] Usar llamados a la acción claros.
- [ ] Incentivar el registro de clientes.
  - Avance `2026-09-24`: formulario con QR y descuentos por fidelidad para clientas registradas.
- [ ] Implementar descuentos para primera compra.
- [ ] Publicar testimonios y contenido generado por clientes.
- [ ] Crear campañas de remarketing.
- [ ] Promocionar el bot como canal de atención y beneficios.
- [ ] Medir el origen de cada cliente captado.

## 8. Newsletter
- [x] Registro de suscriptores desde la tienda. `2026-09-24`
- [x] Primeras campañas desde el panel. `2026-09-25`
- [x] Plantilla de correo y enlace para desuscribirse. `2026-09-25`
- [x] Editor de campañas, redacción con IA, envío programado y envío por correo. `2026-09-27`

## 9. Infraestructura
- [x] Proyecto base, base de datos (Prisma) y datos de ejemplo. `2026-09-23`
- [x] Scripts de arranque y de commit. `2026-09-23`
- [x] Despliegue con Docker y docker-compose. `2026-09-24`

## Indicadores clave
- [ ] Nuevos seguidores relevantes.
- [ ] Alcance e interacción en Instagram.
- [x] Visitas al catálogo web.
- [ ] Tasa de conversión.
- [x] Cantidad de consultas atendidas por el bot.
- [x] Ventas provenientes de Instagram.
- [ ] Valor promedio de cada pedido.
- [ ] Rotación de inventario.
- [ ] Nivel de satisfacción del cliente.
