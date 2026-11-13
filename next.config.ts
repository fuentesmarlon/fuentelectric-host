import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las imágenes se sirven tal cual desde /public (son pocas y ya vienen optimizadas).
  images: {
    unoptimized: true,
  },
};

// withSentryConfig sube a Sentry los "source maps" al compilar, para que los errores
// muestren el archivo y la línea reales del código y no el código minificado.
export default withSentryConfig(nextConfig, {
  org: "fuentelectric",
  project: "fuentelectric_asistence_test",

  // Solo muestra los mensajes de la subida en CI, para no llenar la consola local.
  silent: !process.env.CI,

  widenClientFileUpload: true,

  // Los errores del navegador se envían a /monitoring (este mismo sitio) y de ahí a Sentry,
  // así los bloqueadores de anuncios no los frenan. Esta ruta no debe protegerse en el proxy.
  tunnelRoute: "/monitoring",

  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
