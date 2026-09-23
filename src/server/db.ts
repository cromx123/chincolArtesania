import "server-only";
import { PrismaClient } from "@prisma/client";

// Una sola conexión, también durante el recargado en caliente de `next dev`.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
