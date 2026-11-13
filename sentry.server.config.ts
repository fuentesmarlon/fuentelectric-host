// Sentry en el servidor: errores de páginas, acciones (guardar, eliminar…) y rutas /api.
// Es la misma configuración que src/instrumentation-client.ts, sin Replay.

import * as Sentry from "@sentry/nextjs";
import { obtenerEntorno } from "./src/lib/entorno";

Sentry.init({
  dsn: "https://0269f86ce9aab4baa416020849a26230@o4511356598747136.ingest.us.sentry.io/4511372844990464",

  environment: obtenerEntorno(),

  // 10% de las peticiones en producción para no pasar el límite del plan; 100% en pruebas.
  tracesSampleRate: obtenerEntorno() === "produccion" ? 0.1 : 1,

  enableLogs: true,

  // No mandar a Sentry IPs, cookies ni encabezados de los usuarios.
  sendDefaultPii: false,
});
