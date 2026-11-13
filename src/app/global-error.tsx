"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        {/* Último recurso: solo aparece si falla el diseño base de toda la app.
            Los errores dentro del panel los muestra src/app/tableros/error.tsx.
            statusCode={0} muestra el mensaje genérico de Next. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
