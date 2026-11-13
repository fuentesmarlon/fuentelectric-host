// Sentry en el navegador: captura los errores que ven los usuarios en sus pantallas.
// Los errores llegan a sentry.io (organización "fuentelectric") separados por entorno.
// Hay otras dos configuraciones parecidas: sentry.server.config.ts (servidor)
// y sentry.edge.config.ts (proxy). Si cambias algo aquí, revisa si aplica también allá.

import * as Sentry from "@sentry/nextjs";
import { obtenerEntorno } from "@/lib/entorno";

Sentry.init({
  dsn: "https://0269f86ce9aab4baa416020849a26230@o4511356598747136.ingest.us.sentry.io/4511372844990464",

  // Replay graba la sesión (sin datos sensibles) para ver qué hizo el usuario antes del error.
  integrations: [Sentry.replayIntegration()],

  environment: obtenerEntorno(),

  // Qué porcentaje de las visitas se mide en rendimiento. En producción se deja bajo
  // (10%) porque el plan gratuito de Sentry tiene un límite mensual.
  tracesSampleRate: obtenerEntorno() === "produccion" ? 0.1 : 1,
  enableLogs: true,

  // Se graba el 10% de las sesiones normales y el 100% de las que tuvieron un error.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // No mandar a Sentry IPs, cookies ni encabezados de los usuarios.
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
