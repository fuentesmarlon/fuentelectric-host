// Configuración de la línea de comandos de Prisma (migraciones, generate, studio).
// Lee las variables del archivo .env de la raíz.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Las migraciones necesitan una conexión de sesión (DIRECT_URL, puerto 5432 de Supabase).
    // La app usa DATABASE_URL con el pooler en modo "transaction" (puerto 6543); ver src/lib/prisma.ts.
    // OJO: el .env local apunta a PRODUCCIÓN, así que `pnpm db:migrate` cambia la base real.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
