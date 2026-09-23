# Chincol Artesanías

Tienda web y panel administrativo para Chincol Artesanías, creada con Next.js + Prisma + SQLite. El proyecto funciona como catálogo online para vender productos artesanales, con gestión de stock, ventas y costos.

## Stack

- Next.js 15
- React 19
- TypeScript
- Prisma ORM
- SQLite
- Node.js

## Qué incluye

- Catálogo web responsive para desktop y mobile
- Filtros por categoría y disponibilidad
- Ficha de producto con variantes y WhatsApp
- Carrito de compras integrado
- Panel administrativo protegido por login
- Gestión de productos, stock y materiales
- Registro de ventas y cobros pendientes
- Dashboard con estado del mes y alertas
- Calculadora de costo y margen de ganancia

## Rutas principales

- `/` — home y portada
- `/catalogo` — catálogo con filtros
- `/catalogo/[slug]` — detalle del producto
- `/carrito` — carrito y resumen de compra
- `/admin` — dashboard del administrador
- `/admin/productos` — gestión de productos
- `/admin/materiales` — gestión de materiales y compras
- `/admin/ventas` — ventas registradas
- `/admin/calculadora` — cálculo de precio y margen

## Requisitos

- Node.js 20+
- npm

## Configuración inicial

```bash
npm install
```

Copia las variables de entorno de ejemplo y ajusta lo necesario:

```bash
cp .env.example .env.local
```

Importante:
- `DATABASE_URL` debe apuntar a la base SQLite del proyecto.
- `ADMIN_PASSWORD` es la contraseña para entrar al panel administrativo.
- Si quieres, también puedes completar `NEXT_PUBLIC_WHATSAPP`, `NEXT_PUBLIC_INSTAGRAM`, etc.

### Variables recomendadas

```env
DATABASE_URL="file:./chincol.db"
ADMIN_PASSWORD="tu_password"
NEXT_PUBLIC_WHATSAPP="56912345678"
NEXT_PUBLIC_INSTAGRAM="@chincolartesanias"
NEXT_PUBLIC_EMAIL="contacto@ejemplo.com"
```

## Base de datos

Este proyecto usa Prisma con SQLite.

```bash
npx prisma db push
npx prisma generate
```

También puedes inicializar la base con el script de setup:

```bash
npm run db:setup
```

## Ejecutar en local

```bash
npm run dev
```

Luego abrir:

- http://localhost:3000

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npx prisma db push
npx prisma studio
```

## Estructura del proyecto

```text
src/
  app/              Páginas de la app y rutas API
  components/       UI reutilizable
  domain/           reglas de negocio, tipos y lógica de dominio
  server/           servicios, acceso a datos y lógica del admin
  config/           configuración del sitio
  lib/              helpers y utilidades
prisma/
  schema.prisma      esquema de la base de datos
  seed.ts           seed de datos
prisma.config.ts    configuración de Prisma
public/             assets estáticos
```

## Estado actual

El proyecto ya tiene implementado el núcleo de la operación de la pyme:

- catálogo online funcional
- panel administrativo
- productos y materiales
- stock y alertas
- ventas con control de pago
- cálculo de costos

Faltan mejoras de seguimiento, más automatización y expansión del módulo de ayuda/administración según el backlog del proyecto.

## Nota importante

La configuración de Prisma en esta versión ya no se define dentro de `package.json`, sino en `prisma.config.ts`, para evitar la advertencia de deprecación de Prisma 6.
